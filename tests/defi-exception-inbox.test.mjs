import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('../',import.meta.url));
const {
 parseCSV,audit,candidateAction,csvEscape,exportReviewCsv,EXAMPLE,MAX_BYTES,MAX_RECORDS,MAX_COLUMNS
}=require('../defi-review-core.js');
const H='0x'+'a'.repeat(64),H2='0x'+'b'.repeat(64),A='0x'+'c'.repeat(40),B='0x'+'d'.repeat(40);
test('fictional DeFi demo makes the *real* seven-line accounting review, no tax determinations',()=>{
 const a=audit(EXAMPLE);
 assert.equal(a.totalRows,7);assert.equal(a.columns,8);
 assert.equal(a.rowsNeedingReview,7);
 assert.equal(a.repeatedHashEventRows,2);
 assert.equal(a.highPriorityRows,1);
 assert.equal(a.distinctValidTransactionHashes,6);
 assert.deepEqual(a.recognizedHeaders,['tx','method','chain','date','from','to','amount','asset']);
 assert.equal(a.networkCalls,0);assert.equal(a.tokenCharged,'0');
 assert.match(a.disclaimer,/no tax treatment/);
});
test('quoted and multiline CSV parsed as one field, escaped double quotes decoded',()=>{
 const a=parseCSV('Txn Hash,Method,Note\r\n'+H+',"Swap, Stake","a\nsaid ""yes"""\r\n');
 assert.equal(a.length,2);assert.equal(a[1][2],'a\nsaid "yes"');
});
test('CSV strict malformed/unclosed quotes fail with a bounded error',()=>{
 assert.throws(()=>parseCSV('Txn Hash,Method\n'+H+',"bad'),/Unclosed/);
 assert.throws(()=>parseCSV('Txn Hash,Method\n'+H+',Sw"ap'),/Malformed/);
 assert.throws(()=>parseCSV('Txn Hash,Method\n'+H+',"Stake"x'),/Unexpected/);
});
test('CSV enforces UTF-8 byte, input row/column and field size bounds',()=>{
 assert.equal(MAX_BYTES,262144);assert.equal(MAX_RECORDS,750);assert.equal(MAX_COLUMNS,35);
 assert.throws(()=>parseCSV('Transaction Hash,Method\n'+H+','+'가'.repeat(90000)),/256 KiB/);
 assert.throws(()=>parseCSV('Transaction Hash,Method\n'+(H+',Transfer\n').repeat(751)),/750 data rows/);
 assert.throws(()=>parseCSV(Array.from({length:36},(_,i)=>'col'+i).join(',')+'\n'+'1\n'),/35/);
 assert.throws(()=>parseCSV('Transaction Hash,Method\n'+H+','+'Z'.repeat(66000)),/64 KiB/);
});
test('missing schema fails before suggesting accounting activity',()=>{
 assert.throws(()=>audit('name,amount\nAda,1\n'),/Need at least two recognized fields/);
 assert.throws(()=>audit('From,To\n'+A+','+B+'\n'),/transaction hash or method/);
});
test('headers work for explorer-style Transaction Hash/Date & Time/From Address/Value',()=>{
 const s='Transaction Hash,Date & Time (UTC),From Address,To Address,Type,Value\n'+[H,'2026-10-20',A,B,'Transfer','10'].join(',')+'\n';
 const a=audit(s);
 assert.equal(a.totalRows,1);assert.equal(a.recognizedHeaders.includes('tx'),true);
 assert.equal(a.recognizedHeaders.includes('method'),true);
});
test('ambiguous LP, bridges, swaps and rewards flagged rather than tax-categorized',()=>{
 for(const [s,expected] of [['addLiquidity','liquidity'],['bridgeTokens','bridge'],['claimRewards','staking'],['repayBorrow','lending'],['swapExactTokens','swap']]){
  assert.match(candidateAction(s),new RegExp(expected,'i'),s);
 }
 assert.match(candidateAction('Transfer'),/Transfer or balance movement/);
 assert.match(candidateAction('plain unlabelled'),/Unknown/);
});
test('multiple explorer ERC20 transfer logs share tx hash without being asserted duplicate buys',()=>{
 const csv='Txn Hash,Method,Value\n'+H+',Transfer,12\n'+H+',Transfer,14\n'+H2+',swapExactTokensForTokens,5\n';
 const a=audit(csv);
 assert.equal(a.repeatedHashEventRows,2);
 assert.equal(a.distinctValidTransactionHashes,2);
 assert.ok(a.reviewRows[0].reasons.some(s=>s.includes('not counted as separate trades automatically')));
});
test('transfer between matching addresses is a review prompt, never certified self-trade',()=>{
 const a=audit('Hash,Method,From,To,Amount\n'+H+',Transfer,'+A+','+A+',0.5\n');
 assert.match(a.reviewRows[0].reasons.join(' '),/internal\/contract activity/);
 assert.doesNotMatch(JSON.stringify(a),/taxable capital gain\/loss certified/i);
});
test('blank and odd amount formats flagged; tiny zero remains legitimate numeric format',()=>{
 const a=audit('Tx Hash,Method,Amount\n'+H+',Stake,\n'+H2+',Stake,0\n'+H2+',Stake,"1,000"\n');
 assert.equal(a.highPriorityRows,2);
 assert.ok(a.reviewRows[0].reasons.some(s=>s.includes('Amount/value blank')));
 assert.ok(a.reviewRows[2].reasons.some(s=>s.includes('nonnumeric')));
});
test('untrusted transactions never echo names/wallets/tokens; only sanitized review labels/row numbers',()=>{
 const address='0x'+'f'.repeat(40);
 const secret='PRIVATE_DESCRIPTION_STRING_DO_NOT_PRINT';
 const csv='Hash,Method,From,To,Asset,Amount\n'+H+',Bridge '+secret+','+address+','+A+',SECRET_COIN,4\n';
 const a=audit(csv);
 const str=JSON.stringify(a);
 assert.doesNotMatch(str,/PRIVATE_DESCRIPTION_STRING_DO_NOT_PRINT|SECRET_COIN|0xffffffffffffffff/);
});
test('CSV export defaults to NO complete public hash, does not leak original CSV values',()=>{
 const r=audit(EXAMPLE);
 const text=exportReviewCsv(r,false);
 assert.ok(text.startsWith('"csvRow","reviewLevel"'));
 assert.ok(!text.includes('0x'+'1'.repeat(64)));
 assert.ok(!text.includes('Ada'));
 assert.equal(parseCSV(text).length,r.rowsNeedingReview+1);
});
test('buyer-owned opt-in to full public EVM tx hashes; no raw arbitrary data echoed',()=>{
 const r=audit('Transaction Hash,Method,Amount\n'+H+',swap,0.1\n');
 const one=exportReviewCsv(r,true);
 assert.ok(one.includes(H));
 assert.equal(parseCSV(one).length,2);
});
test('CSV formula escape prefixes guarded, including leading whitespace',()=>{
 for (const sample of ['=HYPERLINK("x")','+2','@who','-SUM(2)','  =1+1']){
  assert.match(csvEscape(sample),/^"'|^" {2}'/);
 }
});
test('UI wiring is same-origin, free and not an onchain trading interface',()=>{
 const page=readFileSync(root+'defi-exception-inbox.html','utf8');
 for(const id of ['defi-csv','defi-file','defi-demo','defi-run','defi-clear','defi-output','defi-download','defi-include-hash'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/defi-review-core.js/);assert.match(page,/defi-review-ui.js/);
 assert.match(page,/15 native Base USDC/);
 assert.match(page,/No completed paid customer yet/);
});
test('no wallet, network client, transaction sending, telemetry or local storage implementation',()=>{
 const core=readFileSync(root+'defi-review-core.js','utf8');
 const ui=readFileSync(root+'defi-review-ui.js','utf8');
 for(const src of [core,ui])
  for(const marker of [/\bfetch\s*\(/, /XMLHttpRequest/,/\.sendTransaction/,/localStorage/,/sessionStorage/,/window\.ethereum/,/privateKeyToAccount/,/navigator\.sendBeacon/,/https?:\/\/[^'"]*api/i])
   assert.doesNotMatch(src,marker);
});
test('no new paid sales booked by a page, directory, report or estimate',()=>{
 const j=JSON.parse(readFileSync(root+'catalog.json','utf8'));
 const sku=j.offers.find(o=>o.id==='manual-defi-transaction-exception-review-15usdc');
 assert.equal(sku.confirmed_paid_customers,0);
 assert.equal(sku.checkout_status,'MANUAL_SCOPE_AGREEMENT_BEFORE_PAYMENT');
 assert.equal(sku.price_native_circle_base_usdc,'15.000000');
 assert.equal(sku.free_analysis_network_calls,0);
 assert.equal(sku.professional_tax_advice,false);
});


test('strict same-origin CSP loads styles/scripts as static files; no inline scripts or uploads',()=>{
 const page=readFileSync(root+'defi-exception-inbox.html','utf8');
 assert.match(page,/connect-src 'none'/);
 assert.match(page,/style-src 'self'/);
 assert.match(page,/href="defi-exception-inbox.css"/);
 assert.doesNotMatch(page,/<style>|<script>.*<\/script>/s);
 const css=readFileSync(root+'defi-exception-inbox.css','utf8');
 assert.match(css,/\.results/);
});
