import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(root+p,'utf8');
test('existing x402 merchant CORS 49USDC price is one-merchant-route offer, not a new SKU',()=>{
 const d=JSON.parse(read('catalog.json'));
 const o=d.offers.filter(x=>x.id==='x402-merchant-browser-cors-qa-fixed-scope');
 assert.equal(o.length,1);
 assert.equal(o[0].indicative_price_native_base_circle_usdc,'49.000000');
 assert.equal(o[0].synthetic_invoice_expected_price_check,true);
 assert.equal(o[0].merchant_issuance_denied_negative_case,true);
 assert.equal(o[0].actual_paid_client_enquiries_confirmed,0);
 assert.equal(o[0].private_invoice_or_wallet_authorization_required,false);
 assert.equal(o[0].instant_checkout,false);
});
test('public 49USDC scoped merchant QA offer distinguishes a free diagnostic from written paid work',()=>{
 const s=read('services.html');
 const start=s.indexOf('id="x402-audit"');
 assert.ok(start>0);
 const content=s.slice(start,s.indexOf('</article>',start));
 assert.match(content,/x402 invoice-price &amp; browser CORS QA/);
 assert.match(content,/49 USDC/);
 assert.match(content,/single route/);
 assert.match(content,/invoice_not_found/);
 assert.match(content,/buyer-supplied expected amount/);
 assert.match(content,/paid client count currently zero/);
 assert.match(content,/No wallet signing/);
 assert.match(content,/contact.html\?service=x402-cors/);
});
test('shop-front public enquiry form retains original stable identifier and 49USDC selectable route',()=>{
 const s=read('contact.html');
 assert.match(s,/value="x402 merchant CORS and quote QA"/);
 assert.match(s,/x402 Base USDC 청구금액·CORS 호환성 QA \(기준 49 USDC\)/);
 assert.match(read('llms.txt'),/one-route x402 merchant invoice-price & browser-CORS QA/);
});
test('public free quote demo is NOT a paid endorsement or merchant-dispatch test',()=>{
 const s=read('docs/X402_BROWSER_CORS_SELLER_AUDIT.md');
 assert.match(s,/genuine independent.*Bitrefill developer issue/);
 assert.match(s,/1,000 USDC HTTP 402 placeholder/);
 assert.match(s,/one-click fictional sample/i);
 assert.match(s,/not.*a promise to call an authenticated private invoice/i);
 assert.match(s,/No clients have purchased\s+this particular audit yet/);
 assert.match(s,/written scope/);
});
