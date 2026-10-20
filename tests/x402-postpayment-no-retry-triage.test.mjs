import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {triageX402Incident, demoPostPaymentFailure} from '../x402-receipt-triage-core.mjs';

const fakeHash = '0x'+'A0'.repeat(32);
const triage = (args={}) => triageX402Incident({...demoPostPaymentFailure,...args});
test('real after-signature/confirmed/HTTP500 scenario results in delivery dispute, not a new charge',()=>{
 const r=triage();
 assert.equal(r.status,'REPORTED_SETTLED_BUT_DELIVERY_FAILED');
 assert.equal(r.paymentRetryRecommended,false);
 assert.equal(r.onchainSettlementIndependentlyVerified,false);
 assert.equal(r.merchantDeliveryIndependentlyVerified,false);
 assert.equal(r.fundsRecovered,false);
 assert.match(r.explanation,/does not reverse/);
 assert.match(r.steps.join(' '),/never sign a second charge/i);
});
test('public Base transaction hash becomes correctly scoped safe explorer link, not RPC verification',()=>{
 const r=triage({publicBaseTxHash:fakeHash});
 assert.equal(r.txExplorerUrl,'https://basescan.org/tx/'+fakeHash.toLowerCase());
 assert.equal(r.networkRequests,0);
 assert.equal(r.evidenceOrigin,'SELF_REPORTED_ONLY');
});
test('no wallet signature and no confirmed event do not create a fictitious charge',()=>{
 const r=triage({signed:'no',onchain:'not_confirmed',delivery:'unknown'});
 assert.equal(r.status,'NO_SIGNATURE_REPORTED_CHAIN_NOT_CONFIRMED');
 assert.equal(r.paymentRetryRecommended,false);
 assert.equal(r.txExplorerUrl,null);
});
test('signed, chain unconfirmed must refuse retry',()=>{
 const r=triage({onchain:'not_confirmed'});
 assert.equal(r.status,'POTENTIALLY_PAID_UNRESOLVED');
 assert.match(r.steps[0],/STOP/);
});
test('signed but chain unknown and delivery unusable must refuse retry',()=>{
 const r=triage({onchain:'unknown'});
 assert.equal(r.status,'POTENTIALLY_PAID_UNRESOLVED');
 assert.match(r.explanation,/not proof/);
});
test('confirmed transfer and delivered report does not establish independent validation',()=>{
 const r=triage({delivery:'valid_delivered'});
 assert.equal(r.status,'REPORTED_PAYMENT_AND_DELIVERY');
 assert.equal(r.onchainSettlementIndependentlyVerified,false);
});
test('confirmed transfer but delivery unknown is not customer report success',()=>{
 const r=triage({delivery:'unknown'});
 assert.equal(r.status,'REPORTED_SETTLEMENT_DELIVERY_UNKNOWN');
 assert.equal(r.merchantDeliveryIndependentlyVerified,false);
});
test('conflicting no-signature plus confirmed transfer stops same-purchase attribution',()=>{
 const r=triage({signed:'no'});
 assert.equal(r.status,'CONFLICTING_EVIDENCE');
 assert.match(r.explanation,/different events/);
});
test('no signature but a usable free response is not a mandatory charge',()=>{
 const r=triage({signed:'no',onchain:'unknown',delivery:'valid_delivered'});
 assert.equal(r.status,'DELIVERY_WITHOUT_REPORTED_PAYMENT');
 assert.equal(r.paymentRetryRecommended,false);
});
test('never suggest reauthorization in any selection combination',()=>{
 for(const signed of ['no','yes','unknown'])
  for(const onchain of ['confirmed','not_confirmed','unknown'])
   for(const delivery of ['valid_delivered','failed_or_invalid','unknown']) {
    const r=triage({signed,onchain,delivery});
    assert.equal(r.paymentRetryRecommended,false,JSON.stringify({signed,onchain,delivery}));
    assert.equal(r.onchainSettlementIndependentlyVerified,false);
    assert.equal(r.wasPaymentSignedByThisTool,false);
    assert.equal(r.networkRequests,0);
    assert.ok(r.steps.length>=2);
    assert.match(r.disclaimer,/No tax, legal, security or refund guarantee/);
   }
});
test('reject undeclared signature/chain/delivery states and absent required status values',()=>{
 for(const input of [
  {signed:'paid'}, {signed:''}, {signed:null},
  {onchain:'success'}, {onchain:'block_already_exists'},
  {delivery:'200'}, {delivery:null}
 ]) {
  assert.throws(()=>triage(input),TypeError);
 }
 assert.throws(()=>triageX402Incident({}),TypeError);
});
test('reject sensitive signed headers, wallet-like addresses, URLs, XSS and impossible hash shape',()=>{
 for(const publicBaseTxHash of [
  '0x'+'b'.repeat(40),
  'https://malicious.example/x',
  'PAYMENT-SIGNATURE: '+fakeHash,
  'Authorization: Bearer token',
  '<img src=x onerror=alert(1)>',
  fakeHash+'\n',
  '0x'+'g'.repeat(64),
  5,
  null,
  false
 ]) {
  assert.throws(()=>triage({publicBaseTxHash}),TypeError,String(publicBaseTxHash).slice(0,60));
 }
});
test('all valid hash case is canonicalized; no raw user-supplied text reaches a URL',()=>{
 const r=triage({publicBaseTxHash:'0x'+'F'.repeat(64)});
 assert.equal(r.txExplorerUrl,'https://basescan.org/tx/0x'+'f'.repeat(64));
});
test('landing page forms bind to browser-only modules and disclose no paid success',()=>{
 const html=readFileSync(new URL('../x402-inspector.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../x402-inspector.css',import.meta.url),'utf8');
 const js=readFileSync(new URL('../x402-receipt-triage-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/id="settlement-no-retry"/);
 assert.match(html,/id="receipt-triage-form"/);
 assert.match(html,/id="receipt-triage-result"/);
 assert.match(html,/id="incident-signed"/);
 assert.match(html,/id="incident-chain"/);
 assert.match(html,/id="incident-delivery"/);
 assert.match(html,/id="incident-hash"/);
 assert.match(html,/src="x402-receipt-triage-ui.mjs"/);
 assert.match(html,/request a scoped quote/);
 assert.match(html,/FREE post-payment no-retry checklist/);
 assert.match(html,/This checklist runs in this browser only/);
 assert.match(css,/\.incident-grid/);
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(js,/document\.createElement\("li"\)/);
 assert.doesNotMatch(js,/innerHTML|fetch\(|XMLHttpRequest|ethereum\.request|sendTransaction|signTypedData/);
});
test('agent docs describe verified-vs-unverified boundary',()=>{
 const txt=readFileSync(new URL('../llms.txt',import.meta.url),'utf8');
 assert.match(txt,/FREE local x402 post-payment incident triage/);
 assert.match(txt,/never recommends automatic retry/);
 assert.match(txt,/No tax, legal, security or refund guarantee|no transaction independently verified/i);
});
