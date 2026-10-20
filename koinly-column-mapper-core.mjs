/**
 * Original strictly LOCAL, deliberately noninterpreting exchange CSV -> Koinly
 * column mapper, based on the public Koinly Simple/Trades/Universal headers.
 * This maps ONE input row to ONE output row. NO price, side, timestamp,
 * cost-basis, trade, partial fill, or fee inference, and NO remote upload.
 * It does NOT verify Koinly app acceptance or financial/tax accuracy.
 */
export const MAX_BYTES=512*1024, MAX_ROWS=200, MAX_COLUMNS=40, MAX_CELL=16000;
export const TEMPLATES=Object.freeze({
  universal:{
    required:['Date','Sent Amount','Sent Currency','Received Amount','Received Currency'],
    optional:['TxHash','Description','Tag','Fee Amount','Fee Currency']
  },
  simple:{
    required:['Koinly Date','Amount','Currency'],
    optional:['TxHash','Description','Tag','Fee Amount','Fee Currency']
  },
  trades:{
    required:['Koinly Date','Pair','Side','Amount','Total'],
    optional:['Order ID','Trade ID','Description','Fee Amount','Fee Currency']
  }
});
const NUMBER=/^(?:0|[1-9]\d{0,22})(?:\.\d{1,24})?$/;
const SIGNED=/^-?(?:0|[1-9]\d{0,22})(?:\.\d{1,24})?$/;
const ASSET=/^[A-Z0-9][A-Za-z0-9:#._-]{0,110}$/;
const TRADEPAIR=/^[A-Za-z0-9]{2,24}[-/][A-Za-z0-9]{2,24}$/;
const HEADERFORBIDDEN=/[\0\r\n]/;
const FORMULA=/^[\s]*[=+@-]/;
// The independent SAME-OWNER VM3 structural checker presently applies
// narrower limits than this conservative mapper for certain valid-looking
// source records. This metadata is an ADVISORY, never a Koinly vendor rule.
const VM3_COLUMNS=36, VM3_DECIMAL_FRACTION=18, VM3_SYMBOL_CHARS=44, VM3_PAIR_SIDE_CHARS=18;
function siblingPreflightAdvisories(rows, headers, targets, sourceIdx) {
  const warnings=new Set();
  if(headers.length>VM3_COLUMNS)
    warnings.add('The separate VM3 Koinly format preflight currently caps total CSV columns at 36; this candidate has more, so the separate checker will reject it. This is not evidence Koinly itself rejects the file.');
  for(const cells of rows){
    for(let i=0;i<targets.length;i++){
      const field=targets[i],value=cells[sourceIdx[i]];
      if(['Amount','Total','Sent Amount','Received Amount','Fee Amount'].includes(field)){
        const frac=String(value??'').split('.')[1]??'';
        if(frac.length>VM3_DECIMAL_FRACTION)
          warnings.add('The separate VM3 Koinly format preflight currently limits fractional decimals to 18 places; this candidate includes higher source precision. We preserved the original amount exactly. Koinly vendor acceptance is unverified.');
      }
      if(['Currency','Sent Currency','Received Currency','Fee Currency'].includes(field) && value && value.length>VM3_SYMBOL_CHARS)
        warnings.add('The separate VM3 preflight currently accepts asset-symbol strings shorter than 45 characters; original extended contract symbols may be longer. This checker limitation is not a Koinly verdict.');
      if(field==='Pair' && value){
        const halves=value.split(/[-/]/);
        if(halves.length===2 && halves.some(h=>h.length>VM3_PAIR_SIDE_CHARS))
          warnings.add('The separate VM3 preflight currently accepts pair symbols of at most 18 characters per asset; the mapper preserved an existing longer pair. Koinly import compatibility remains unverified.');
      }
    }
  }
  return [...warnings];
}
const int= x => Number.isInteger(x);

export function parseExchangeCsv(src) {
  if(typeof src!=='string'||!src ||new TextEncoder().encode(src).length>MAX_BYTES)
    throw Error('CSV must be nonempty UTF-8 source at most 512 KiB.');
  if(src.includes('\0')||src.includes('\ufffd'))throw Error('CSV has unsupported characters.');
  src=src.replace(/^\uFEFF/,'');
  const records=[];let row=[],cell='',state=0;
  function pushCell() {
    if(cell.length>MAX_CELL)throw Error('A source CSV cell exceeds the 16,000-character cap.');
    row.push(cell);cell='';state=0;
    if(row.length>MAX_COLUMNS)throw Error('More than 40 CSV columns are not supported.');
  }
  function pushRow() {
    pushCell();
    // Never silently DROP a blank record in a supposedly row-preserving mapping.
    if(row.every(x=>x===''))throw Error('Blank data records cannot be mapped without loss; correct the source.');
    records.push(row);row=[];
    if(records.length>MAX_ROWS+1)throw Error('More than 200 CSV data records; split original source safely.');
  }
  for(let i=0;i<src.length;i++){
    const c=src[i];
    if(state===1){
      if(c==='"'&&src[i+1]==='"'){cell+='"';i++}
      else if(c==='"'){state=2}
      else cell+=c;
    }else if(state===2){
      if(c===',')pushCell();
      else if(c==='\n'||c==='\r'){pushRow();if(c==='\r'&&src[i+1]==='\n')i++;}
      else throw Error('Invalid nonseparator after a closing CSV quote.');
    }else{
      if(c==='"'&&cell.length)throw Error('Unescaped quote inside CSV field.');
      if(c==='"')state=1;
      else if(c===',')pushCell();
      else if(c==='\n'||c==='\r'){pushRow();if(c==='\r'&&src[i+1]==='\n')i++;}
      else cell+=c;
    }
    if(cell.length>MAX_CELL)throw Error('A source CSV cell exceeds the 16,000-character cap.');
  }
  if(state===1)throw Error('Unclosed CSV quote.');
  if(row.length||cell.length||state===2)pushRow();
  if(records.length<2)throw Error('At least one header row and one data row are required.');
  const headers=records.shift();
  if(headers.length<2||headers.length>MAX_COLUMNS||headers.some(x=>!x.trim()||HEADERFORBIDDEN.test(x)))
    throw Error('Source CSV headers must be nonblank and contain 2–40 fields.');
  if(headers.some(h=>/^[\s]*[=+@-]/.test(h)))throw Error('A source header resembles a spreadsheet formula.');
  const key=h=>h.trim().toLowerCase();
  if(new Set(headers.map(key)).size!==headers.length)throw Error('Duplicate or ambiguous CSV source headers.');
  const expected=headers.length;
  for(const [i,cells] of records.entries()){
    if(cells.length!==expected)throw Error('CSV record '+(i+2)+' has a different column count; no rows exported.');
    for(const value of cells)if(/[\0\u0001-\u0008\u000e-\u001f]/.test(value))
      throw Error('A source value contains disallowed control characters.');
  }
  return {headers,records,rowCount:records.length};
}

const validDecimal=(v,signed=false)=> (signed?SIGNED:NUMBER).test(v) && !/^-?0(?:\.0+)?$/.test(v);
const validAsset=v=>ASSET.test(v);
const validUtc=v=>{
  if(!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(v))return false;
  const m=v.match(/^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)$/);
  if(!m)return false;
  const [year,month,day,hour,minute,second]=m.slice(1).map(Number);
  if(year<2000||year>2100||month<1||month>12||day<1||day>31||hour>23||minute>59||second>59)return false;
  const date=new Date(Date.UTC(year,month-1,day,hour,minute,second));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day
    &&date.getUTCHours()===hour&&date.getUTCMinutes()===minute&&date.getUTCSeconds()===second;
};
const csvCell=s=> /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
const rowCsv=arr=>arr.map(csvCell).join(',')+'\r\n';
const checkFormula=(value)=> {
  // Do not "escape" arbitrary source text, since mutation corrupts financial evidence.
  // A *numeric* signed amount is not a spreadsheet injection.
  return FORMULA.test(value)&&!SIGNED.test(value.trim());
};
function validate(template, row, num){
  const issues=[];
  const error=(field,msg)=>issues.push({sourceRecord:num,field,reason:msg});
  const dt=row[template==='universal'?'Date':'Koinly Date'];
  if(!validUtc(dt))error(template==='universal'?'Date':'Koinly Date','Expected an existing UTC YYYY-MM-DD HH:mm:ss timestamp. No timezone assumption or automatic conversion.');
  if(template==='simple'){
    if(!validDecimal(row.Amount,true))error('Amount','Expected signed nonzero decimal; withdrawals must already be negative in the original data.');
    if(!validAsset(row.Currency))error('Currency','Missing or unsupported asset symbol string.');
  }
  if(template==='trades'){
    if(!TRADEPAIR.test(row.Pair))error('Pair','Use an existing BASE/QUOTE or BASE-QUOTE pair; no inferred market.');
    if(!['Buy','Sell'].includes(row.Side))error('Side','Source must explicitly contain Buy or Sell; no guessed direction.');
    if(!validDecimal(row.Amount))error('Amount','Expected positive gross base-asset decimal.');
    if(!validDecimal(row.Total))error('Total','Expected positive gross quote-asset decimal; no price calculation.');
  }
  if((row['Fee Amount']??'') || (row['Fee Currency']??'')){
    if(!row['Fee Amount']||!row['Fee Currency'])
      error('Fee Amount','Fee Amount and Fee Currency must both be present; never invent fee evidence.');
    else if(!validDecimal(row['Fee Amount']))
      error('Fee Amount','Expected positive sourced decimal fee amount.');
    else if(!validAsset(row['Fee Currency']))
      error('Fee Currency','Expected source-provided nonblank fee asset.');
  }
  if(template==='trades'){
    for(const idField of ['Order ID','Trade ID']){
      const identity=row[idField];
      if(identity && !/^[a-zA-Z0-9]{4,160}$/.test(identity))
        error(idField,'Koinly expects an alphanumeric identifier at least four characters long. Verify real source IDs.');
    }
  }
  if(row.Tag){
    const documented=new Set(['other income','reward','mining','airdrop','fork','salary',
      'lending interest','loan','marg loan','realized gain','futures fee','funding fee',
      'unstake','cashback','fee refund','cost','other fee','margin fee','loan fee',
      'loan repayment','margin repayment','lost','gift','donation','stake',
      'liquidity in','liquidity out']);
    if(!documented.has(row.Tag))
      error('Tag','Unknown Koinly CSV tag. No automatic classification or ignored swap tags.');
  }
  if(template==='universal'){
    for(const [n,c] of [['Sent Amount','Sent Currency'],['Received Amount','Received Currency']]){
      const amount=row[n],currency=row[c];
      if(Boolean(amount)!==Boolean(currency))error(n,'Amount and currency must appear together on each side.');
      if(amount && !validDecimal(amount))error(n,'Amounts must be already sourced as positive nonzero gross decimals.');
      if(currency && !validAsset(currency))error(c,'Missing or unsupported asset symbol string.');
    }
    if(!row['Sent Amount']&&!row['Received Amount'])error('Date','Neither sent nor received side is present; cannot create a transaction.');
  }
  return issues;
}
export function buildKoinlyCsv(input,{template='universal',mapping={},confirmedUtc=false}={}){
  const config=TEMPLATES[template];
  if(!config)throw Error('Choose Universal, Simple, or Trades Koinly template.');
  if(confirmedUtc!==true)throw Error('Confirm source timestamps are already UTC; no timezone guessing.');
  if(typeof input!=='string')throw Error('Only raw bounded CSV text is accepted, not unvalidated parsed objects.');
  const original=parseExchangeCsv(input);
  const supported=[...config.required,...config.optional];
  if(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||Object.keys(mapping).some(k=>!supported.includes(k)))
    throw Error('Only documented Koinly template fields may be mapped.');
  const targets=[],mapped=new Set(),sourceIdx=[];
  for(const k of supported){
    const from=mapping[k];
    if(from===null||from===undefined||from==='') {
      if(config.required.includes(k))throw Error('Required target header is not mapped: '+k);
      continue;
    }
    if(typeof from!=='string')throw Error('Source mapping must use an existing header name.');
    const i=original.headers.indexOf(from);
    if(i<0)throw Error('The source header for '+k+' is not present.');
    if(mapped.has(i))throw Error('The same source column cannot be mapped twice; source evidence would be ambiguous.');
    mapped.add(i);targets.push(k);sourceIdx.push(i);
  }
  // Always preserve every source cell not used by a mapped target, with
  // explicit Source column labels, even if Koinly ignores those extra columns.
  const extras=original.headers.map((h,i)=>({h,i})).filter(({i})=>!mapped.has(i));
  const headers=[...targets,...extras.map(({h})=>'Source: '+h)];
  if(headers.length>MAX_COLUMNS+10)throw Error('Too many source-preservation fields.');
  let out=rowCsv(headers);
  const issues=[];
  for(let ri=0;ri<original.records.length;ri++){
    const cells=original.records[ri],record=ri+2;
    if(cells.length!==original.headers.length)throw Error('Malformed source row at '+record);
    if(cells.some(checkFormula)){
      issues.push({sourceRecord:record,field:'source value',reason:'Spreadsheet formula-like cell; do not export untrusted formulas.'});
      continue;
    }
    const projection=Object.fromEntries(targets.map((k,i)=>[k,cells[sourceIdx[i]]]));
    const issueCountBeforeThisRow=issues.length;
    issues.push(...validate(template,projection,record));
    // Continue inspecting every subsequent source row. A prior bad row must
    // NEVER suppress detection of a second independent error. The ENTIRE
    // downloadable CSV remains null if even one source record has an issue.
    if(issues.length>issueCountBeforeThisRow)continue;
    out+=rowCsv([...sourceIdx.map(i=>cells[i]),...extras.map(({i})=>cells[i])]);
    if(new TextEncoder().encode(out).length>MAX_BYTES*2)throw Error('Result exceeds a safe download limit.');
  }
  const siblingWarnings=siblingPreflightAdvisories(original.records,headers,targets,sourceIdx);
  const report={
    template,
    vm3PublicPreflightKnownInputLimitWarnings:siblingWarnings,
    vm3PublicPreflightActuallyRunOnUserFile:false,
    vm3PublicPreflightGuaranteesKoinlyImport:false,
    sourceRows:original.rowCount,
    outputRows:issues.length?0:original.rowCount,
    sourceColumns:original.headers.length,
    mappedOfficialColumns:targets.length,
    preservedOriginalSourceColumns:extras.length,
    sourceRowDeletionOrMergingPerformed:false,
    sourceCellValuesAutoEdited:false,
    computedOrGuessedTradesOrCostBasis:false,
    originTimezoneIndependentlyVerified:false,
    KoinlyImportAcceptanceIndependentlyVerified:false,
    anyFinancialOrTaxAdviceGiven:false,
    issues:issues.slice(0,50),
    warnings:[
      ...siblingWarnings,
      'Your source timestamps must REALLY be UTC; checking shape does not prove timezone.',
      'Unknown source columns have been preserved as Source: fields, which Koinly may ignore.',
      'No exchange software, Koinly account or actual user data was used to verify import acceptance.',
      'Koinly may merge fills with the SAME Order ID after import; this mapper never deletes or merges source rows.',
      'Never guess missing amounts, market price, acquisition history, side, tax basis or trade pair.',
      'CSV output with sensitive values stays in this browser until YOU download or import it; treat exported file as private financial data.'
    ]
  };
  if(issues.length)return {ok:false,csv:null,report:{...report,issueCount:issues.length}};
  return {ok:true,csv:out,report:{...report,issueCount:0}};
}
export const demoExchangeCsv=[
  'time_utc,amount_sent,asset_sent,amount_received,asset_received,venue_note,execution_ref',
  '2026-10-20 10:10:00,150,USDC,0.05,ETH,"fake swap, not live",EX-A101',
  '2026-10-20 11:11:12,,,2.3,USDC,"fictional incoming, not paid",EX-A102',
  '2026-10-20 12:13:14,1,ETH,,,"fake outgoing, not onchain",EX-A103'
].join('\r\n');
export const demoMapping=Object.freeze({
  Date:'time_utc','Sent Amount':'amount_sent','Sent Currency':'asset_sent',
  'Received Amount':'amount_received','Received Currency':'asset_received',
  Description:'venue_note'
});
