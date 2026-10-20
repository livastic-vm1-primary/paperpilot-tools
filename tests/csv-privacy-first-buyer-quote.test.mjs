import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 SYNTHETIC_UNPAID_QUOTE_CSV,syntheticUnpaidQuoteBody,
 checkCsvForRemote,ATOMIC_AMOUNT,USDC,NETWORK,RECIPIENT,
} from '../src/csv-x402-guard.mjs';
import {FIXED_FICTIONAL_CSV,inspectUnpaidCsvCheckout} from '../examples/verify-csv-x402-unpaid.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const src=read('src/csv-wallet-checkout-entry.mjs');
const page=read('csv-usdc-checkout.html');
const doc=read('docs/CSV_005_UNPAID_BUYER_VERIFICATION_20261021.md');
const receipt=JSON.parse(read('docs/CSV_005_UNSIGNED_QUOTE_PROOF_20261021.json'));

const section=(a,b)=>{
 const x=src.split(a),y=x.length===2?x[1].split(b):[];
 assert.equal(x.length,2,'missing section '+a);
 assert.ok(y.length>=1 && x[1].includes(b),'missing end '+b);
 return y[0];
};
const freeQuote=section('async function quote(){','async function connect(){');
const paid=section('async function buyOnce(){','input?.addEventListener("input",resetQuote);');

test('fixed firstparty synthetic CSV matches original independently verified price fixture exactly',()=>{
 assert.equal(SYNTHETIC_UNPAID_QUOTE_CSV,'id,amount\nSYNTHETIC_1,1.25\nSYNTHETIC_2,2.50');
 assert.equal(SYNTHETIC_UNPAID_QUOTE_CSV,FIXED_FICTIONAL_CSV);
 assert.deepEqual(JSON.parse(syntheticUnpaidQuoteBody()),{csvText:SYNTHETIC_UNPAID_QUOTE_CSV});
 assert.equal(syntheticUnpaidQuoteBody().includes('account'),false);
 assert.equal(syntheticUnpaidQuoteBody().includes('password'),false);
});
test('free price request does not depend on private or changed browser user CSV',()=>{
 const original=syntheticUnpaidQuoteBody();
 for(const example of ['id,balance\nPRIVATE_MARKER_ABC,934.01','key,secret\nDO_NOT_SEND,123']) {
   assert.deepEqual(JSON.parse(syntheticUnpaidQuoteBody()),{csvText:SYNTHETIC_UNPAID_QUOTE_CSV});
   assert.ok(!original.includes(example));
 }
 assert.equal(original,syntheticUnpaidQuoteBody());
});
test('customer source cannot be prepared for actual upload without separate affirmative upload consent',()=>{
 assert.throws(()=>checkCsvForRemote('name,amount\nPRIVATE_MARKER,25',false),/Confirm/);
 assert.deepEqual(JSON.parse(checkCsvForRemote('name,amount\nPRIVATE_MARKER,25',true)),
   {csvText:'name,amount\nPRIVATE_MARKER,25'});
});
test('free quote browser function never looks at textarea, chosen file or privacy checkbox',()=>{
 assert.match(freeQuote,/readQuote\(syntheticUnpaidQuoteBody\(\)\)/);
 assert.doesNotMatch(freeQuote,/merchantBody\(\)|input\.value|csvText|privacy\.checked|checkCsvForRemote/);
 assert.match(freeQuote,/YOUR CSV WAS NOT UPLOADED/);
 assert.doesNotMatch(freeQuote,/sendTransaction|signTypedData|eth_requestAccounts/);
});
test('second fresh quote before EIP-712 uses fictional fixture, never the visitor source',()=>{
 assert.match(paid,/const body=merchantBody\(\)/);
 assert.match(paid,/const fresh=await readQuote\(syntheticUnpaidQuoteBody\(\)\)/);
 assert.doesNotMatch(paid,/readQuote\(body\)/);
 assert.ok(paid.indexOf('const body=merchantBody()')<paid.indexOf('readQuote(syntheticUnpaidQuoteBody())'));
});
test('signed buyer POST alone receives selected real CSV in payload after the validated signature phase',()=>{
 const signature=paid.indexOf('const signaturePayload=await http.createPaymentPayload(fresh)');
 const paidPost=paid.indexOf('const response=await fetch(CSV_API,{');
 assert.ok(signature>0 && paidPost>signature);
 assert.ok(paid.indexOf('state.paymentAttempted=true')<signature);
 const post=paid.slice(paidPost);
 assert.match(post,/body,cache:"no-store",credentials:"omit",redirect:"error"/);
 assert.match(post,/\.\.\.extraHeaders/);
 assert.match(paid,/headerNames\[0\]!=="payment-signature"/);
});
test('upload privacy and quote-price consents are rechecked before and after wallet signing',()=>{
 const before=paid.slice(0,paid.indexOf('state.paymentAttempted=true'));
 assert.match(before,/!privacy\.checked\|\|!consent\.checked/);
 const after=paid.slice(paid.indexOf('const signaturePayload=await http.createPaymentPayload(fresh)'));
 assert.match(after,/!privacy\.checked\|\|!consent\.checked/);
 assert.match(after,/checkCsvForRemote\(input\.value,privacy\.checked\)!==body/);
});
test('invalid CSV, failed wallet connection and rejected unsigned quote must not lock payment attempts permanently',()=>{
 const prefix=paid.slice(0,paid.indexOf('const body=merchantBody()'));
 assert.doesNotMatch(prefix,/paymentAttempted=true/);
 assert.ok(paid.indexOf('state.paymentAttempted=true')>paid.indexOf('assertExpectedQuote(fresh)'));
 assert.match(paid,/state\.busy=true;buttons\(\)/);
});
test('once signature begins, price change or transport ambiguity cannot auto retry the paid POST',()=>{
 assert.match(paid,/state\.paymentAttempted=true;buttons\(\)/);
 assert.match(paid,/method:"POST"/);
 assert.doesNotMatch(paid,/wrapFetchWithPayment\s*\(|setTimeout\s*\(|setInterval\s*\(|retry\s*\(|for\(.*fetch/);
 assert.match(paid,/No signed POST dispatched/);
});
test('browser UI clearly discloses free synthetic quotes and real source only on signed purchase',()=>{
 assert.match(page,/Unpaid price quotes use only a fixed fictional CSV/);
 assert.match(page,/No wallet or upload permission is needed just to check the price/);
 assert.match(page,/The unpaid price check sends fictional rows, not my CSV/);
 assert.match(page,/selected CSV being sent to VM5 on the signed paid request only/);
 assert.ok(!page.includes('first unpaid quote already sends your CSV'));
 assert.match(page,/untested-with-real-wallet beta/);
});
test('historical v0.1.0 proof remains accurate and flags newer privacy-first behavior',()=>{
 assert.match(doc,/Privacy update after the original/);
 assert.match(doc,/No visitor CSV is uploaded before wallet payment authorization/);
 assert.equal(receipt.unsignedPostHttpStatus,402);
 assert.equal(receipt.expectedAtomicUSDC,'5000');
 assert.equal(receipt.independentOnchainSettlementVerified,false);
});
test('no new merchant, chain or payout recipient created by the privacy repair',()=>{
 assert.equal(ATOMIC_AMOUNT,'5000');
 assert.equal(NETWORK,'eip155:8453');
 assert.equal(RECIPIENT,'0x6b01efA0705E91a7aca54271510bf9e594717f34');
 assert.equal(USDC.toLowerCase(),'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
 assert.doesNotMatch(src,/localStorage|sessionStorage|privateKeyToAccount|sendTransaction|eth_sendTransaction/);
});
test('read-only CLI evidence script reuses the same synthetic sample and never reads the customer CSV',()=>{
 const script=read('examples/verify-csv-x402-unpaid.mjs');
 assert.match(script,/const body=syntheticUnpaidQuoteBody\(\)/);
 assert.match(script,/FIXED_FICTIONAL_CSV = SYNTHETIC_UNPAID_QUOTE_CSV/);
 assert.doesNotMatch(script,/readFileSync|fs\.readFile|process\.stdin|walletClient|privateKeyToAccount/);
 assert.equal(typeof inspectUnpaidCsvCheckout,'function');
});
test('catalog no longer claims that unpaid price lookup sends buyer-owned CSV',()=>{
 const c=JSON.parse(read('catalog.json'));
 const o=c.offers.filter(x=>x.id==='buyer-owned-base-usdc-csv-browser-checkout');
 assert.equal(o.length,1);
 assert.equal(o[0].quotes_upload_csv_only_after_separate_consent,false);
 assert.equal(o[0].unpaid_quote_fixed_fictional_csv_only,true);
 assert.equal(o[0].unpaid_quote_may_contain_visitor_data,false);
 assert.equal(o[0].browser_user_input_transmitted_only_after_one_signed_paid_request_and_explicit_upload_consent,true);
 assert.equal(o[0].confirmed_independent_paid_POST_customers,0);
 assert.equal(o[0].real_wallet_paid_settlement_browser_integration_tested,false);
});
test('privacy explanation documents the difference from older beta without claiming paid settlement',()=>{
 const explanation=read('docs/CSV_005_PRIVACY_FIRST_FICTIONAL_QUOTE_20261021.md');
 assert.match(explanation,/Only the public fictional source-owned text below is sent/);
 assert.match(explanation,/without transmitting actual visitor source rows/);
 assert.match(explanation,/earlier VM1 beta let the visitor consent/i);
 assert.match(explanation,/UNVERIFIED/);
 assert.match(explanation,/No automatic|not.*auto|cannot be retried/i);
});
test('firstparty checkout links truthful privacy explanation and actual synthetic-only refund caveats',()=>{
 assert.ok(page.includes('docs/CSV_005_PRIVACY_FIRST_FICTIONAL_QUOTE_20261021.md'));
 assert.ok(page.includes('No real CSV is transmitted while checking the price.'));
 assert.ok(page.includes('Your actual file is sent to VM5 only after you separately authorize a one-time paid report.'));
 assert.ok(!page.includes('first unpaid quote already sends your CSV'));
});
test('the actual published browser bundle was regenerated from synthetic-only current source',()=>{
 const built=read('csv-wallet-checkout.bundle.js');
 assert.ok(built.length>100000);
 assert.ok(built.includes('SYNTHETIC_1,1.25'));
 assert.ok(built.includes('SYNTHETIC_2,2.50'));
 assert.ok(built.includes('YOUR CSV WAS NOT UPLOADED'));
 assert.ok(!built.includes('quotedBody'));
});
