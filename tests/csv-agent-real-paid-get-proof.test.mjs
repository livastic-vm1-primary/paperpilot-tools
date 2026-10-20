import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html = readFileSync(new URL('../csv-usdc-checkout.html', import.meta.url), 'utf8');
const llms = readFileSync(new URL('../llms.txt', import.meta.url), 'utf8');
test('independent fixed synthetic GET proof links to exact historical third party and onchain event',()=>{
  assert.match(html,/id="independent-agent-paid-proof"/);
  assert.match(html,/nohumans\.directory\/l\/816d6709-3d0/);
  assert.match(html,/0xc0c69aa8709b848ab3c0d521ac6540e019738f0804565dfe19652bcb3c290838/);
  assert.match(html,/19 October 2026/);
  assert.match(html,/actually paid 0\.005 USDC and validated delivery/);
});
test('prominently separates verified synthetic GET from unverified buyer-input paid POST',()=>{
  assert.match(html,/Do not confuse these two products/);
  assert.match(html,/not<\/strong> a real paid response/);
  assert.match(html,/customer-owned CSV paid POST or independent paying user for that POST has yet been verified/);
  assert.match(html,/This was already counted historically, not a new purchase/);
  assert.match(html,/No payment has been requested/);
  assert.match(html,/does not auto-retry signed payments/);
});
test('agent can view synthetic sample without wallet and choose official isolated paid API',()=>{
  assert.match(html,/https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/csv-sample/);
  assert.match(html,/https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/csv-report/);
  assert.match(html,/CSV_REAL_DATA_BUYER_QUICKSTART_20261020.md/);
  assert.match(html,/Base mainnet/);
});
test('machine-readable guidance says the proof is old and GET-only',()=>{
  assert.match(llms,/nohumans\.directory\/l\/816d6709-3d0/);
  assert.match(llms,/GET proof is an ALREADY BOOKED historical/);
  assert.match(llms,/POST currently has ZERO paid external buyer reports/);
});
