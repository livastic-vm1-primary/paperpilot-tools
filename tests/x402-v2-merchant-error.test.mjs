import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {analyze,TEST_FIXTURE}=require('../x402-inspector-core.js');
const source=readFileSync(new URL('../x402-inspector.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../x402-inspector.html',import.meta.url),'utf8');
const data=()=>structuredClone(TEST_FIXTURE);

test('x402 spec ordinary unpaid header error is shown but never a verified payment',()=>{
 const v=data(); v.error='PAYMENT-SIGNATURE header is required';
 const r=analyze(JSON.stringify(v));
 assert.equal(r.merchantReportedError,'PAYMENT-SIGNATURE header is required');
 assert.equal(r.options[0].amountUSDC,'0.010000');
 assert.equal(r.merchantErrorUnverified,true);
 assert.equal(r.onchainSettlementVerified,false);
 assert.equal(r.merchantIdentityVerified,false);
 assert.equal(r.networkRequests,0);
 assert.equal(r.chargedUSDC,'0');
 assert.match(r.notices.join(' '),/Do not auto-retry/);
});
test('payment error typed as merchant text, not an independently verified facilitator reason',()=>{
 const v=data();v.error='Facilitator verify failed (400): self_send_not_allowed';
 const r=analyze(JSON.stringify(v));
 assert.match(r.merchantReportedError,/self_send_not_allowed/);
 assert.match(r.notices.join(' '),/merchant-reported error/);
 assert.equal(r.merchantErrorUnverified,true);
});
test('public base64 PAYMENT-REQUIRED header can carry quote and error text',()=>{
 const v=data();v.error='invalid_or_expired_authorization';
 const base64=Buffer.from(JSON.stringify(v),'utf8').toString('base64');
 const r=analyze('HTTP/1.1 402 Payment Required\nPAYMENT-REQUIRED: '+base64);
 assert.equal(r.merchantReportedError,'invalid_or_expired_authorization');
 assert.equal(r.options[0].amountUSDC,'0.010000');
});
test('arbitrary markup and control characters remain bounded untrusted text',()=>{
 const v=data();
 v.error='BEFORE'+'<script>alert(1)</script>'+'\n'+('Z'.repeat(800));
 const r=analyze(JSON.stringify(v));
 assert.equal(r.merchantReportedError.includes('<script>'),true);
 assert.equal(r.merchantReportedError.includes('\n'),false);
 assert.ok(r.merchantReportedError.length<=240);
 assert.doesNotMatch(source,/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
 assert.match(source,/\.textContent\s*=/);
 assert.match(source,/el\("p", "fine", report\.merchantReportedError\)/);
});
test('non-string error content is not executed nor reported as a true diagnosis',()=>{
 const v=data();
 v.error={then:'run code',invalidReason:'self_send_not_allowed'};
 const r=analyze(JSON.stringify(v));
 assert.equal(r.merchantReportedError,'');
 assert.match(r.notices.join(' '),/non-string merchant error/);
 assert.equal(r.merchantIdentityVerified,false);
});
test('absent server error does not fabricate payment failure',()=>{
 const r=analyze(JSON.stringify(data()));
 assert.equal(r.merchantReportedError,'');
 assert.equal(r.options.length,1);
 assert.doesNotMatch(r.notices.join(' '),/auto-retry/);
});
test('signed headers still cannot be pasted or mistaken for a public quote',()=>{
 assert.throws(()=>analyze('PAYMENT-SIGNATURE: some-private-signature'),/private signed payment or authorization/);
 assert.throws(()=>analyze('PAYMENT-RESPONSE: ' + Buffer.from('{"success":true}','utf8').toString('base64')),Error);
});
test('page explains merchant text is unverified and never offers automatic retry',()=>{
 assert.match(ui,/untrusted server/);
 assert.match(ui,/Never paste a signed payment header/);
 assert.match(ui,/No instant checkout on this page/);
 assert.match(source,/check independent wallet\/transaction status before retrying/);
 assert.doesNotMatch(source,/fetch\s*\(|window\.ethereum|signTypedData/);
});
