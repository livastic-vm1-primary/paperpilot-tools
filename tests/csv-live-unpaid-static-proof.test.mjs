import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const page=read('csv-usdc-checkout.html');
const doc=read('docs/CSV_005_UNPAID_BUYER_VERIFICATION_20261021.md');
const proof=JSON.parse(read('docs/CSV_005_UNSIGNED_QUOTE_PROOF_20261021.json'));
const llms=read('llms.txt');
test('real buyer page links unpaid original quote and declines to claim a buyer',()=>{
 assert.ok(page.includes('docs/CSV_005_UNPAID_BUYER_VERIFICATION_20261021.md'));
 assert.match(page,/no wallet or buyer payment claimed/);
 assert.ok(page.includes('untested-with-real-wallet beta'));
});
test('immutable observed real unsigned CORS and header evidence has no funded receipt',()=>{
 assert.equal(proof.corsPreflightHttpStatus,204);
 assert.equal(proof.unsignedPostHttpStatus,402);
 assert.equal(proof.expectedAtomicUSDC,'5000');
 assert.equal(proof.quotedNativeCircleBaseUSDC,'0.005');
 assert.equal(proof.observedEncodedPaymentRequiredBytes,2560);
 assert.equal(proof.nativeCircleBaseUSDC.toLowerCase(),'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
 assert.equal(proof.userWalletFundsMoved,false);
 assert.equal(proof.independentOnchainSettlementVerified,false);
 assert.equal(proof.actualNewReceivedUSDC,'0');
});
test('public document explicitly distinguishes a quote from unknown customer payment',()=>{
 assert.match(doc,/Paid CSV POST HTTP 200 and delivered result \| NOT VERIFIED/);
 assert.match(doc,/No independent buyer-owned CSV POST was verified paid/);
 assert.match(doc,/Neither run spent money or connected a wallet/);
 assert.match(doc,/completely fabricated/i);
 assert.doesNotMatch(doc,/verified .*customer.*successfully paid/i);
});
test('machine agent guide links source and accurate unsettled buying evidence',()=>{
 assert.ok(llms.includes('CSV_005_UNPAID_BUYER_VERIFICATION_20261021.md'));
 assert.ok(llms.includes('verify-csv-x402-unpaid.mjs'));
 assert.match(llms,/NOT signed payment, paid HTTP200/);
});
