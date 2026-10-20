import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  parseExchangeCsv,buildKoinlyCsv,TEMPLATES,demoExchangeCsv,demoMapping,MAX_BYTES,MAX_ROWS
} from '../koinly-column-mapper-core.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const csvSimple=(d='2026-10-20 10:00:00',a='-1.5',c='USDC')=>
  'dateutc,quantity,coin,sourceMemo\r\n'+[d,a,c,'synthetic'].join(',')+'\r\n';
const simple={template:'simple',mapping:{'Koinly Date':'dateutc',Amount:'quantity',Currency:'coin'},confirmedUtc:true};
const universal={template:'universal',mapping:demoMapping,confirmedUtc:true};
const fmt=(data,opts=simple)=>buildKoinlyCsv(data,opts);
test('officially documented headers for 3 Koinly CSV types are case-and-whitespace exact',()=>{
  assert.deepEqual(TEMPLATES.simple.required,['Koinly Date','Amount','Currency']);
  assert.deepEqual(TEMPLATES.trades.required,['Koinly Date','Pair','Side','Amount','Total']);
  assert.deepEqual(TEMPLATES.universal.required,['Date','Sent Amount','Sent Currency','Received Amount','Received Currency']);
});
test('fully fictional Universal mapper maps 3 rows unchanged and appends every unused source column',()=>{
  const result=fmt(demoExchangeCsv,universal);
  assert.equal(result.ok,true);
  assert.equal(result.report.sourceRows,3);
  assert.equal(result.report.outputRows,3);
  assert.equal(result.report.preservedOriginalSourceColumns,1);
  assert.equal(result.report.sourceCellValuesAutoEdited,false);
  assert.match(result.csv,/^Date,Sent Amount,Sent Currency,Received Amount,Received Currency,Description,Source: execution_ref/);
  const parsed=parseExchangeCsv(result.csv);
  assert.deepEqual(parsed.records.map(row=>row.at(-1)),['EX-A101','EX-A102','EX-A103']);
  assert.ok(result.csv.includes('"fake swap, not live"'));
  assert.equal(parsed.records.length,3);
});
test('A missing source, duplicate selected source, or undocumented target mapping fails closed',()=>{
  assert.throws(()=>fmt(csvSimple(),{...simple,mapping:{...simple.mapping,Amount:'MISSING'}}),/not present/);
  assert.throws(()=>fmt(csvSimple(),{...simple,mapping:{...simple.mapping,Amount:'dateutc'}}),/same source column/);
  assert.throws(()=>fmt(csvSimple(),{...simple,mapping:{...simple.mapping,CapitalGain:'quantity'}}),/documented/);
});
test('source UTC confirmation must be explicit and false never auto-converts zone',()=>{
  assert.throws(()=>fmt(csvSimple(),{...simple,confirmedUtc:false}),/Confirm source timestamps/);
  const bad=csvSimple('2026-10-20T10:00:00+09:00');
  const r=fmt(bad);assert.equal(r.ok,false);
  assert.equal(r.csv,null);
  assert.equal(r.report.outputRows,0);
  assert.match(r.report.issues[0].reason,/UTC/);
});
test('Gregorian UTC date is validated, including leap years and impossible day/time',()=>{
  for(const date of ['2026-02-29 10:00:00','2026-13-01 00:00:00','2026-01-32 00:00:00',
    '2026-10-20 24:00:00','2026-10-20 20:60:00','2026-10-20 11:22:60','2026-00-20 12:00:00']){
    assert.equal(fmt(csvSimple(date)).ok,false,date);
  }
  assert.equal(fmt(csvSimple('2024-02-29 23:59:59')).ok,true);
});
test('Simple allows positive incoming and negative withdrawal but never zero or nonexistent decimals',()=>{
  for (const a of ['1','-1','-0.1','0.00000001','100.200']) assert.equal(fmt(csvSimple(undefined,a)).ok,true,a);
  for (const a of ['0','0.0','-0.00000','1e3','+2','-a','1.2.3','']) assert.equal(fmt(csvSimple(undefined,a)).ok,false,a);
});
test('unquoted locale grouping comma breaks CSV width, never silently accepted as a financial amount',()=>{
  assert.throws(()=>fmt(csvSimple(undefined,'1,000')),/different column count/);
});
test('Universal fails closed on source omission, wrong amounts, partial currency pairs',()=>{
  let bad=demoExchangeCsv.replace('150,USDC','150,');
  assert.equal(fmt(bad,universal).ok,false);
  bad=demoExchangeCsv.replace('150,USDC','-150,USDC');
  assert.equal(fmt(bad,universal).ok,false);
  bad=demoExchangeCsv.replace('150,USDC','0,USDC');
  assert.equal(fmt(bad,universal).ok,false);
});
test('Trades has truthful Buy/Sell and source pair, no inferred direction or prices',()=>{
  const text='utc,market,side,base,quote,memo,order,trade\n2026-10-20 20:20:00,ETH/USDC,Buy,1,2500,fictional,ABCD123,TCDE123';
  const opts={template:'trades',confirmedUtc:true,
    mapping:{'Koinly Date':'utc',Pair:'market',Side:'side',Amount:'base',Total:'quote',Description:'memo','Order ID':'order','Trade ID':'trade'}};
  const r=fmt(text,opts);assert.equal(r.ok,true);
  assert.ok(r.csv.startsWith('Koinly Date,Pair,Side,Amount,Total,Order ID,Trade ID,Description'));
  assert.ok(r.report.warnings.some(x=>/may merge fills/i.test(x)));
  assert.equal(fmt(text.replace(',Buy,',',Long,'),opts).ok,false);
  assert.equal(fmt(text.replace('ETH/USDC','ETH_USDC'),opts).ok,false);
  assert.equal(fmt(text.replace('TCDE123','x'),opts).ok,false);
  assert.equal(fmt(text.replace(',2500,',',-2500,'),opts).ok,false);
});
test('never silently drop blank source row or ragged data row',()=>{
  assert.throws(()=>parseExchangeCsv('a,b\r\n1,2\r\n\r\n3,4'),/Blank data records/);
  assert.throws(()=>parseExchangeCsv('a,b\n1,2\n3'),/different column count/);
});
test('proper RFC CSV embedded CRLF, BOM, doubled quote and escaped commas round trip',()=>{
  const source='\uFEFFdateutc,quantity,coin,sourceMemo\r\n2026-10-20 10:00:00,-2,BTC,"synthetic ""memo"", with\r\nnewline"';
  const original=parseExchangeCsv(source);
  assert.equal(original.rowCount,1);
  const out=fmt(source);
  assert.equal(out.ok,true);
  const round=parseExchangeCsv(out.csv);
  assert.equal(round.records[0].at(-1), 'synthetic "memo", with\r\nnewline');
});
test('quote failures, duplicate headers, invalid codepoints and missing header fail closed',()=>{
  for(const value of ['a,b\n"unclosed,b','a,b\nx"oops",b','a,b\na,"b"x'])
    assert.throws(()=>parseExchangeCsv(value),/quote/i);
  assert.throws(()=>parseExchangeCsv('Name,name\nx,y'),/Duplicate/);
  assert.throws(()=>parseExchangeCsv('a,b\n1,\ufffd'),/unsupported characters/);
  assert.throws(()=>parseExchangeCsv('a,b\n1,\0'),/unsupported characters/);
});
test('CSV spreadsheet injection is REFUSED, never silently edited, even in preserved extras',()=>{
  for(const cell of ['=HYPERLINK("http://example.test")','+CMD',' @SUM(1)','-danger']) {
    const r=fmt(csvSimple(undefined,'2').replace('synthetic', '"'+cell.replaceAll('"','""')+'"'));
    assert.equal(r.ok,false,cell);
    assert.equal(r.csv,null);
    assert.equal(r.report.outputRows,0);
  }
});
test('individual rows are not partially exported when a later row is invalid',()=>{
  const x=csvSimple()+'2026-10-20 12:00:00,not_a_number,ETH,synthetic2\n';
  const r=fmt(x);
  assert.equal(r.ok,false);
  assert.equal(r.csv,null);
  assert.equal(r.report.sourceRows,2);
  assert.equal(r.report.outputRows,0);
  assert.equal(r.report.issues[0].sourceRecord,3);
});
test('strict input limit supports 200 rows exactly but rejects row 201',()=>{
  const one='2026-10-20 10:00:00,-1.0,BTC,note';
  assert.equal(fmt('dateutc,quantity,coin,sourceMemo\n'+Array(200).fill(one).join('\n')).ok,true);
  assert.throws(()=>fmt('dateutc,quantity,coin,sourceMemo\n'+Array(201).fill(one).join('\n')),/200 CSV/);
  assert.throws(()=>parseExchangeCsv('a,b\n1,'+'x'.repeat(MAX_BYTES)),/512 KiB/);
});
test('currency and fee pairs cannot be made up; keep optional tags only when documented',()=>{
  const rows='utc,pair,side,base,total,fee,coin,tag\n2026-10-20 20:00:00,BTC-USDC,Sell,1,100,0.01,ETH,reward';
  const opts={template:'trades',mapping:{'Koinly Date':'utc',Pair:'pair',Side:'side',Amount:'base',Total:'total','Fee Amount':'fee','Fee Currency':'coin'},confirmedUtc:true};
  assert.equal(fmt(rows,opts).ok,true);
  assert.equal(fmt(rows.replace(',ETH,reward',',,reward'),opts).ok,false);
  assert.equal(fmt(rows.replace(',0.01,ETH',',0,ETH'),opts).ok,false);
  // Only Simple/Universal template officially expose Tag in their main
  // documented optional-field table; do not invent Trades template flags.
  const tagCsv='dateutc,quantity,coin,sourceMemo\n2026-10-20 10:00:00,2,BTC,reward';
  const tagOptions={...simple,mapping:{...simple.mapping,Tag:'sourceMemo'}};
  assert.equal(fmt(tagCsv,tagOptions).ok,true);
  assert.equal(fmt(tagCsv.replace('reward','swap'),tagOptions).ok,false);
});
test('output report never contains source financial values or original headers',()=>{
  const secret='my private venue customer note 942746';
  const source=csvSimple().replace('synthetic',secret);
  const r=fmt(source);
  assert.equal(r.ok,true);
  const str=JSON.stringify(r.report);
  assert.equal(str.includes(secret),false);
  assert.equal(str.includes('dateutc'),false);
  assert.equal(str.includes('sourceMemo'),false);
  assert.equal(r.report.KoinlyImportAcceptanceIndependentlyVerified,false);
  assert.equal(r.report.anyFinancialOrTaxAdviceGiven,false);
});

test('every malformed row is independently identified, instead of stopping after first bad record',()=>{
  const source=[
    'dateutc,quantity,coin,sourceMemo',
    '2026-13-20 10:00:00,1,USDC,syntheticA',
    '2026-10-20 10:00:00,not_a_number,ETH,syntheticB',
    '2026-10-20 10:00:00,-0.5,BTC,syntheticC'
  ].join('\r\n');
  const out=fmt(source);
  assert.equal(out.ok,false);
  assert.equal(out.csv,null);
  assert.equal(out.report.sourceRows,3);
  assert.equal(out.report.outputRows,0);
  assert.equal(out.report.issueCount,2);
  assert.deepEqual(out.report.issues.map(x=>x.sourceRecord),[2,3]);
  assert.equal(JSON.stringify(out.report).includes('syntheticA'),false);
});

test('spreadsheet formula failure does not hide subsequent unrelated date and amount issues',()=>{
  const source=[
    'dateutc,quantity,coin,sourceMemo',
    '2026-10-20 10:00:00,-1,BTC,"=HYPERLINK(""http://fiction.invalid"")"',
    '2026-02-30 10:00:00,1,USDC,note',
    '2026-10-20 10:00:00,garbage,ETH,note'
  ].join('\n');
  const r=fmt(source);
  assert.equal(r.ok,false);
  assert.equal(r.csv,null);
  assert.equal(r.report.issueCount,3);
  assert.deepEqual(r.report.issues.map(x=>x.sourceRecord),[2,3,4]);
  assert.match(r.report.issues[0].reason,/Spreadsheet formula/);
});

test('sibling checker narrower 18-place decimal limit is an explicit advisory, never a data rewrite',()=>{
  const amount='0.123456789012345678901';
  const r=fmt(csvSimple(undefined,amount));
  assert.equal(r.ok,true);
  assert.ok(r.csv.includes(amount));
  assert.ok(r.report.vm3PublicPreflightKnownInputLimitWarnings.some(x=>x.includes('18 places')));
  assert.equal(r.report.vm3PublicPreflightActuallyRunOnUserFile,false);
  assert.equal(r.report.vm3PublicPreflightGuaranteesKoinlyImport,false);
  assert.ok(!JSON.stringify(r.report).includes(amount));
  const normal=fmt(csvSimple(undefined,'0.123456789012345678'));
  assert.equal(normal.ok,true);
  assert.equal(normal.report.vm3PublicPreflightKnownInputLimitWarnings.length,0);
});

test('sibling checker narrower 36-column limit is disclosed without dropping unused source cells',()=>{
  const extras=Array.from({length:34},(_,i)=>'src'+(i+1));
  const row=['2026-10-20 10:00:00','1.3','ETH',...extras.map((_,i)=>'fakeextra'+i)];
  const source=['utc,amount,currency',...extras].join(',')+'\n'+row.join(',');
  const r=fmt(source,{template:'simple',mapping:{'Koinly Date':'utc',Amount:'amount',Currency:'currency'},confirmedUtc:true});
  assert.equal(r.ok,true);
  assert.equal(r.report.sourceColumns,37);
  assert.equal(r.report.outputRows,1);
  assert.equal(r.report.preservedOriginalSourceColumns,34);
  assert.ok(r.report.vm3PublicPreflightKnownInputLimitWarnings.some(x=>x.includes('36')));
  const converted=parseExchangeCsv(r.csv);
  assert.equal(converted.headers.length,37);
  assert.equal(converted.records[0].at(-1),'fakeextra33');
  assert.ok(!JSON.stringify(r.report).includes('fakeextra33'));
});

test('extended token contract identifiers and long base/quote pairs get sibling checker warnings only',()=>{
  const asset='USDC:0x'+'a'.repeat(40)+':BASE';
  const x=fmt(csvSimple(undefined,'10',asset));
  assert.equal(x.ok,true);
  assert.ok(x.csv.includes(asset));
  assert.ok(x.report.vm3PublicPreflightKnownInputLimitWarnings.some(s=>s.includes('asset-symbol')));
  const pair='A'.repeat(19)+'/'+'B'.repeat(19);
  const trades='utc,pair,side,base,total\n2026-10-20 10:00:00,'+pair+',Buy,1,500';
  const opts={template:'trades',mapping:{'Koinly Date':'utc',Pair:'pair',Side:'side',Amount:'base',Total:'total'},confirmedUtc:true};
  const t=fmt(trades,opts);
  assert.equal(t.ok,true);
  assert.ok(t.report.vm3PublicPreflightKnownInputLimitWarnings.some(s=>s.includes('18 characters per asset')));
});

test('public core refuses unbounded parsed record objects rather than bypassing UTF8 CSV size and row checks',()=>{
  const forged={headers:['dateutc','quantity','coin'],records:[['2026-10-20 10:00:00','1','ETH']]};
  assert.throws(()=>buildKoinlyCsv(forged,simple),/Only raw bounded CSV text/);
  assert.throws(()=>buildKoinlyCsv(null,simple),/Only raw bounded CSV text/);
});
