import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  analyzeNarrativeCsv,parseExchangeCsv,demoNarrativeCsv,MAX_ROWS,MAX_COLUMNS
} from '../koinly-column-mapper-core.mjs';

const analyze=(source=demoNarrativeCsv,column='description')=>analyzeNarrativeCsv(source,{descriptionColumn:column});
const input=(rows,header='date_utc,description,memo')=>
  [header,...rows.map(([date,description,memo])=>[date,description,memo].join(','))].join('\r\n');
const d='2026-10-20 12:12:12';

test('purely fictional examples yield exact 3 row preserving evidence, never Koinly official trade columns',()=>{
 const r=analyze();assert.equal(r.ok,true);
 const a=parseExchangeCsv(demoNarrativeCsv);
 const b=parseExchangeCsv(r.csv);
 assert.equal(r.report.sourceRows,3);
 assert.equal(r.report.matchedRows,3);
 assert.equal(r.report.resultRows,3);
 assert.equal(b.rowCount,3);
 assert.equal(b.headers.length,a.headers.length+3);
 assert.deepEqual(b.headers.slice(-3),[
  'Narrative Action (unverified)','Narrative Quantity (unverified)','Narrative Asset (unverified)'
 ]);
 assert.deepEqual(b.records[0].slice(-3),['Purchase (claimed)','1.4324467000','SOL']);
 assert.deepEqual(b.records[1].slice(-3),['Sale (claimed)','0.125','BTC']);
 assert.deepEqual(b.records[2].slice(-3),['Purchase (claimed)','2.000000','ETH']);
 for(let i=0;i<3;i++)assert.deepEqual(b.records[i].slice(0,a.headers.length),a.records[i]);
 assert.ok(!b.headers.includes('Sent Amount'));
 assert.ok(!b.headers.includes('Received Amount'));
 assert.equal(r.report.KoinlyImportAcceptanceVerified,false);
 assert.equal(r.report.priceFeeCashLegOrFiatValueComputed,false);
 assert.equal(r.report.actualVendorWealthsimpleCsvSchemaVerified,false);
});

test('source row count and values including BOM, quoted comma, quotes, and multiline preserved exactly',()=>{
 const src='\uFEFFdate_utc,description,private_note\r\n'+
  d+',Purchase of 0.01023000 USDC,"source ""quote"", with comma"\r\n'+
  d+',Sale of 5 ETH,"multi\r\nline"';
 const r=analyze(src);assert.equal(r.ok,true);
 const before=parseExchangeCsv(src),after=parseExchangeCsv(r.csv);
 assert.equal(after.rowCount,2);
 for(let i=0;i<before.rowCount;i++)
  assert.deepEqual(after.records[i].slice(0,before.headers.length),before.records[i]);
 assert.equal(after.records[0].at(-2),'0.01023000');
 assert.equal(after.records[1].at(-1),'ETH');
});

test('one trailing period permitted as punctuation but triple ellipsis or trading tail remains ambiguous',()=>{
 const permitted=analyze(input([[d,'Sale of 1.25 BTC.','demo']]));
 assert.equal(permitted.ok,true);
 assert.equal(parseExchangeCsv(permitted.csv).records[0].at(-2),'1.25');
 for(const text of [
  'Purchase of 1.4324467000 SOL...',
  'Purchase of 1.4324467000 SOL at 12.99 CAD',
  'Purchase of 1.4324467000 SOL and 0.9 ETH',
  'One Purchase of 1.4324467000 SOL',
  'Purchase of 1.4324467000 SOL trade-123',
  'Purchase of 1.4324467000 SOL; buy',
  'Sale of 3 SOL for 5 USDC',
 ]){
  const r=analyze(input([[d,text,'demo']]));
  assert.equal(r.ok,false,text);
  assert.equal(r.csv,null);
  assert.equal(r.report.resultRows,0);
  assert.equal(r.report.issues[0].kind,'ambiguous_or_unsupported_phrase');
 }
});

test('reject noncanonical casing, nonliteral coins, imprecise decimals, zero, sign, grouping and exponent',()=>{
 for(const text of [
  'purchase of 1 SOL','PURCHASE OF 1 SOL','Sell of 1 SOL','Bought 1 SOL',
  'Purchase of 0 SOL','Purchase of 0.0000 SOL','Sale of -1 SOL',
  'Purchase of +1 SOL','Purchase of 01 SOL','Sale of 1e3 SOL',
  'Purchase of 1. BTC','Sale of 1.0 btc','Sale of 1 DÓGE',
  'Purchase of 1 BTC/BCH','Purchase of 1 BTC-ETF',
  'Purchase of 1.1234567890123456789012345 BTC'
 ]){
  const r=analyze(input([[d,text,'demo']]));
  assert.equal(r.ok,false,text);assert.equal(r.csv,null);
 }
});

test('leading/trailing whitespace or newlines in a description never normalize the source silently',()=>{
 for(const desc of [' Purchase of 1 SOL','Purchase of 1 SOL ','Purchase of 1 SOL\nother']){
  const cell='"'+desc.replaceAll('"','""')+'"';
  const r=analyze(input([[d,cell,'demo']]));
  assert.equal(r.ok,false,desc);
  assert.equal(r.report.issues[0].kind,'noncanonical_description');
  assert.equal(r.csv,null);
 }
});

test('a later bad record blocks ALL annotated output and reports independent unsafe row numbers',()=>{
 const src=input([
  [d,'Purchase of 1 SOL','a'],
  [d,'This field is not a purchase','b'],
  [d,'Sale of 2 ETH and one more','c'],
  [d,'Sale of 3 ETH','d']
 ]);
 const r=analyze(src);
 assert.equal(r.ok,false);
 assert.equal(r.report.sourceRows,4);
 assert.equal(r.report.matchedRows,2);
 assert.equal(r.report.unmatchedRows,2);
 assert.equal(r.report.resultRows,0);
 assert.equal(r.csv,null);
 assert.deepEqual(r.report.issues.map(x=>x.sourceRecord),[3,4]);
 assert.equal(r.report.originalSourceRowsPreservedOnSuccess,true);
 assert.equal(r.report.sourceCellValuesEdited,false);
});

test('spreadsheet formula payload in any ORIGINAL unmapped cell blocks full CSV, without mutating cell',()=>{
 for(const dangerous of [
  '=HYPERLINK("http://fiction.invalid")','+cmd','@sum(1)','-danger'
 ]){
  const src='date_utc,description,memo\n'+
   d+',Purchase of 1 SOL,"'+dangerous.replaceAll('"','""')+'"';
  const r=analyze(src);
  assert.equal(r.ok,false,dangerous);
  assert.equal(r.report.issues[0].kind,'formula_like_source_cell');
  assert.equal(r.csv,null);
 }
 const legitimateNegative='date_utc,description,memo\n'+d+',Purchase of 1 SOL,-0.75';
 assert.equal(analyze(legitimateNegative).ok,true);
});

test('result report never leaks user original memo, exact derived financial number or chosen source header',()=>{
 const secret='SENSITIVE CUSTOMER HISTORY xyz8877';
 const amount='9.123456789012345678901234';
 const src='utc,my_own_special_description,memo\n'+
  d+',Sale of '+amount+' BTC,'+secret;
 const r=analyze(src,'my_own_special_description');
 assert.equal(r.ok,true);
 assert.ok(r.csv.includes(secret));
 assert.ok(r.csv.includes(amount));
 const j=JSON.stringify(r.report);
 for(const forbidden of [secret,amount,'my_own_special_description','Sale of '+amount]){
  assert.equal(j.includes(forbidden),false,forbidden);
 }
 assert.equal(r.report.localOnlyNoUpload,true);
 assert.equal(r.report.taxCostBasisOrTradeCounterpartyInferred,false);
});

test('only true existing source headers accepted; no already annotated CSV or duplicate generated columns',()=>{
 assert.throws(()=>analyze(demoNarrativeCsv,'MISSING'),/Choose exactly one/);
 assert.throws(()=>analyze(demoNarrativeCsv,''),/Choose exactly one/);
 assert.throws(()=>analyzeNarrativeCsv({records:[]},{descriptionColumn:'description'}),/Only original bounded/);
 const collision=input([[d,'Purchase of 1 SOL','memo']],
   'date_utc,description,NARRATIVE ASSET (UNVERIFIED)');
 assert.throws(()=>analyze(collision),/already contains/);
});

test('output width bounded to MAX_COLUMNS and source record cap enforced even when every phrase is valid',()=>{
 const extras=Array.from({length:35},(_,i)=>'extra_'+i);
 const cols=['utc','description',...extras];
 const cells=[d,'Sale of 1 BTC',...extras.map((_,i)=>'extra'+i)];
 const source=cols.join(',')+'\n'+cells.join(',');
 assert.equal(parseExchangeCsv(source).headers.length,37);
 const r=analyze(source);
 assert.equal(parseExchangeCsv(r.csv).headers.length,MAX_COLUMNS);
 const wide=source.replace(',extra_34\n',',extra_34,too_wide\n').replace(',extra34',',extra34,too_wide');
 assert.throws(()=>analyze(wide),/three columns/);
 const long='utc,description,extra\n'+Array(MAX_ROWS).fill(d+',Purchase of 1 SOL,demo').join('\n');
 assert.equal(analyze(long).report.resultRows,MAX_ROWS);
 assert.throws(()=>analyze(long+'\n'+d+',Purchase of 1 SOL,demo'),/200 CSV data/);
});

test('malformed delimiter, quoted field and duplicate header rejected by common existing parser',()=>{
 for(const bad of [
  'utc,description,memo\n'+d+',Purchase of 1 SOL',
  'utc,description,memo\n'+d+',"Purchase of 1 SOL',
  'utc,description,DESCRIPTION\n'+d+',Purchase of 1 SOL,demo',
  'utc,description,memo\n'+d+',Purchase of 1 SOL,demo\n\n'
 ]) assert.throws(()=>analyze(bad));
});

test('genuine public Koinly mapper exposes exact warning, free local controls, and separate optional paid mini-offer',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const html=read('koinly-column-mapper.html');
 const ui=read('koinly-column-mapper-ui.mjs');
 for(const id of ['narrative-description-column','narrative-demo','narrative-analyze','narrative-download',
   'narrative-status','narrative-results'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/not an official Wealthsimple parser/);
 assert.ok(html.includes('https://www.reddit.com/r/koinly/comments/1qi2hw8/wealthsimple_csv_import_not_supported/'));
 assert.match(html,/not a Koinly CSV/);
 assert.match(html,/5 native Base Circle USDC/);
 assert.match(html,/zero verified paying buyers/);
 assert.ok(html.includes('Koinly CSV import guide'));
 assert.match(ui,/analyzeNarrativeCsv/);
 assert.match(ui,/demoNarrativeCsv/);
 assert.match(ui,/narrative-amount-asset-evidence-not-koinly.csv/);
 assert.match(ui,/replaceChildren/);
 assert.match(ui,/textContent/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|innerHTML|outerHTML|window\.ethereum/);
});

test('original normal Koinly mapper remains separate, no automatic target fields inferred from narrative',async()=>{
 const mod=await import('../koinly-column-mapper-core.mjs');
 const options={template:'universal',confirmedUtc:true,
   mapping:{Date:'date_utc',
     'Sent Amount':'Narrative Quantity (unverified)',
     'Sent Currency':'Narrative Asset (unverified)'}};
 const evidence=analyze();
 assert.equal(evidence.ok,true);
 assert.throws(()=>mod.buildKoinlyCsv(evidence.csv,options),/Required target header is not mapped/);
 // The resulting candidate would treat ALL rows as SENT assets although demo
 // includes purchases: it MUST NOT be automatically generated or recommended
 // from the narrative parser. The user must not mistake evidence for a trade.
 assert.equal(evidence.report.KoinlyImportAcceptanceVerified,false);
 assert.equal(evidence.report.taxCostBasisOrTradeCounterpartyInferred,false);
 assert.ok(!evidence.csv.includes('Sent Amount'));
 assert.ok(!evidence.csv.includes('Received Amount'));
 assert.ok(!evidence.csv.includes('Koinly Date'));
});

test('committed fictional narrative fixture exactly matches fresh local core generation including trailing zeros',()=>{
 const source=readFileSync(new URL('../examples/koinly-column-mapper/fictional-narrative-export.csv',import.meta.url),'utf8');
 const committed=readFileSync(new URL('../examples/koinly-column-mapper/fictional-narrative-evidence-only.csv',import.meta.url),'utf8');
 const a=analyze(source);
 assert.equal(a.ok,true);
 assert.equal(a.report.sourceRows,3);
 assert.equal(a.csv.replaceAll('\r\n','\n'),committed);
 const e=parseExchangeCsv(committed);
 assert.equal(e.rowCount,3);
 assert.deepEqual(e.records[0].slice(-3),['Purchase (claimed)','1.4324467000','SOL']);
 assert.equal(e.records[0][1],'Purchase of 1.4324467000 SOL');
});

test('public original merchant catalog remains free while documenting no vendor approval or successful customer',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const j=JSON.parse(read('catalog.json'));
 const p=j.offers.find(x=>x.id==='free-manual-koinly-header-mapper');
 assert.ok(p);
 assert.equal(p.price_usdc,'0.000000');
 assert.equal(p.narrative_price_usdc,'0.000000');
 assert.equal(p.optional_local_narrative_evidence_inspector,true);
 assert.equal(p.narrative_automatic_Koinly_import_candidate,false);
 assert.equal(p.narrative_local_no_upload,true);
 assert.equal(p.narrative_any_ambiguous_row_denies_download,true);
 assert.equal(p.narrative_paying_outside_clients_confirmed,0);
 assert.equal(p.narrative_real_Wealthsimple_schema_tested,false);
 assert.match(read('llms.txt'),/UNVERIFIED quantity\/asset evidence/);
 assert.match(read('README.md'),/Reported unsupported narrative export/);
 assert.match(read('README.md'),/zero independently confirmed paid buyers/);
});
