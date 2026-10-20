import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const fs=require('node:fs');
const free=readFileSync(new URL('../x402-inspector.html',import.meta.url),'utf8');
const checkout=readFileSync(new URL('../csv-usdc-checkout.html',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const entries=new Map(catalog.offers.map(x=>[x.id,x]));
test('free quote inspector links to real existing 0.005 native USDC buyer consent checkout',()=>{
  assert.match(free,/href="csv-usdc-checkout\.html"/);
  assert.match(free,/0\.005 Base USDC/);
  assert.match(free,/different service/);
  assert.match(free,/zero independently verified paid buyer-owned CSV POST orders/);
  assert.ok(fs.existsSync(new URL('../csv-usdc-checkout.html',import.meta.url)));
});
test('buyer checkout links back to no-wallet free x402 quote preview',()=>{
  assert.match(checkout,/href="x402-inspector\.html"/);
  assert.match(checkout,/Free x402 quote preview/);
  assert.ok(fs.existsSync(new URL('../x402-inspector.html',import.meta.url)));
});
test('checkout still requires separate data-upload and payment permission',()=>{
  assert.match(checkout,/id="remote-upload-consent"/);
  assert.match(checkout,/id="remote-payment-consent"/);
  assert.match(checkout,/type="checkbox"/);
  assert.match(checkout,/id="remote-pay-btn"/);
  assert.match(checkout,/disabled/);
  assert.match(checkout,/untested-with-real-wallet beta/);
});
test('original buyer price and separate merchant listings remain honest',()=>{
  const freeOffer=entries.get('free-x402-quote-inspector');
  const checkoutOffer=entries.get('buyer-owned-base-usdc-csv-browser-checkout');
  const remote=entries.get('vm5-x402-csv-preflight');
  const quoteRemote=entries.get('vm5-x402-quote-preflight');
  assert.equal(freeOffer.price_usdc,'0.000000');
  assert.equal(checkoutOffer.price_native_circle_usdc,'0.005000');
  assert.equal(remote.price_native_circle_usdc,'0.005000');
  assert.equal(remote.verified_paid_post_customers,0);
  assert.equal(quoteRemote.price_native_circle_usdc,'0.010000');
  assert.equal(quoteRemote.independently_verified_paid_orders,0);
});
test('inter-page links are not auto paying, signing, or uploading',()=>{
  assert.match(free,/connect-src 'none'/);
  assert.doesNotMatch(free,/<script .*src="csv-wallet-checkout/);
  assert.match(checkout,/id="remote-quote-btn"/);
  assert.match(checkout,/Pay 0.005 USDC once/);
});
