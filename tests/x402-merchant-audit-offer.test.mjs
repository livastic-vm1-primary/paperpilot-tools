import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const services=load('../services.html');
const contact=load('../contact.html');
const contactJs=load('../contact.js');
const guide=load('../docs/X402_BROWSER_CORS_SELLER_AUDIT.md');
const inspector=load('../x402-inspector.html');
const catalog=JSON.parse(load('../catalog.json'));
const seller=catalog.offers.find(x=>x.id==='x402-merchant-browser-cors-qa-fixed-scope');
const free=catalog.offers.find(x=>x.id==='free-x402-browser-cors-selfcheck');
test('manual B2B QA service has a real narrow scope and indicative Base Circle USDC price',()=>{
 assert.match(services,/id="x402-audit"/);
 assert.match(services,/>49 USDC</);
 assert.match(services,/read-only|Read-only/);
 assert.match(services,/two safe OPTIONS probes/i);
 assert.match(services,/written terms/);
 assert.match(services,/no wallet signing/i);
 assert.match(services,/href="contact.html\?service=x402-cors"/);
 assert.match(services,/no verified paid|no.*paid client|paid client count currently zero/i);
});
test('contact form recognizes one real x402 paid buyer inquiry without new accounts',()=>{
 assert.match(contact,/<option value="x402 merchant CORS and quote QA">/);
 assert.match(contactJs,/'x402-cors': 'x402 merchant CORS and quote QA'/);
 assert.match(contact,/name="third_party_form_consent"/);
 assert.match(contact,/name="email"/);
});
test('an original offline merchant self-check is visibly linked from existing free inspector',()=>{
 assert.match(inspector,/services.html#x402-audit/);
 assert.match(inspector,/No instant checkout on this page/);
 assert.match(inspector,/connect-src 'none'/);
 assert.match(guide,/tools\/x402-browser-cors-preflight.mjs/);
 assert.match(guide,/No real customer wallet/);
});
test('manual 49 native Circle Base USDC offer is NOT false checkout or sale',()=>{
 assert.equal(seller.instant_checkout,false);
 assert.equal(seller.written_scope_and_legitimate_payee_required,true);
 assert.equal(seller.escrow,false);
 assert.equal(seller.confirmed_external_paid_customers,0);
 assert.equal(seller.indicative_price_native_base_circle_usdc,'49.000000');
 assert.equal(seller.payment_network,'eip155:8453');
 assert.match(seller.caveat,/No client wallet signatures/);
});
test('free service has zero cost/network and no wallet',()=>{
 assert.equal(free.price_usdc,'0.000000');
 assert.equal(free.remote_api_requests_by_script,0);
 assert.equal(free.wallet_signing,false);
 assert.match(free.customer_payment_claim,/No external paid customer/);
});
test('all direct paths remain authentic separate original project not unrelated brand wallets',()=>{
 assert.match(seller.page,/livastic-vm1-primary\.github\.io\/paperpilot-tools\/services\.html#x402-audit/);
 assert.match(seller.inquiry,/livastic-vm1-primary\.github\.io\/paperpilot-tools\/contact\.html\?service=x402-cors/);
 assert.match(free.source,/github.com\/livastic-vm1-primary\/paperpilot-tools\/blob\/main\/tools/);
});
