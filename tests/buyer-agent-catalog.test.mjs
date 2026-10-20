import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
const llms = readFileSync(new URL('../llms.txt', import.meta.url), 'utf8');
const page = readFileSync(new URL('../csv-quality-api.html', import.meta.url), 'utf8');

test('clear disclosure: catalog is not a contract or a payment record', () => {
  assert.equal(catalog.schema, 'paperpilot-public-buyer-offers-v1');
  assert.match(catalog.disclosure, /One human economic owner/);
  assert.match(catalog.note, /not a contract/);
});
test('single exact paid merchant quote, not an earned order', () => {
  const api = catalog.offers.find(x => x.id === 'vm5-x402-csv-preflight');
  assert.equal(api.endpoint, 'https://vm5-openapi-x402.onrender.com/v1/csv-preflight');
  assert.equal(api.price_native_circle_usdc, '0.005000');
  assert.equal(api.network, 'eip155:8453');
  assert.equal(api.protocol, 'x402 v2');
  assert.equal(api.verified_paid_post_customers, 0);
  assert.equal(api.requires_explicit_buyer_wallet_authorization, true);
});
test('free checker is truly labelled unpaid and local', () => {
  const free = catalog.offers.find(x => x.id === 'csv-local-preview');
  assert.equal(free.price_usdc, '0.000000');
  assert.equal(free.file_upload, false);
  assert.equal(free.max_input_utf8_bytes, 32768);
  assert.equal(free.login_required, false);
});
test('seller never presents manual order as one-click settled sale', () => {
  const kit = catalog.offers.find(x => x.id === 'manual-paperpilot-offline-kit');
  assert.equal(kit.instant_checkout, false);
  assert.equal(kit.buyer_written_agreement_required, true);
  assert.equal(kit.confirmed_paid_PaperPilot_orders, 0);
});
test('public agent guide distinguishes quotes, sales and sensitive data', () => {
  assert.match(llms, /No independently verified paid POST customers/);
  assert.match(llms, /Quotes are NOT purchases/);
  assert.match(llms, /wallet recovery phrases/);
  assert.match(llms, /Same|same.owner|same single|same-owner/);
});
test('public page publishes the new readable discovery surfaces', () => {
  assert.match(page, /rel="alternate" type="text\/plain" title="AI agent buyer guide" href="llms.txt"/);
  assert.match(page, /rel="alternate" type="application\/json" title="Buyer offer catalog" href="catalog.json"/);
  assert.match(page, /<a href="llms\.txt">Agent guide<\/a>/);
  assert.match(page, /<a href="catalog\.json">Offer JSON<\/a>/);
});
test('only HTTPS real buyer destinations and no keys or fabricated payments', () => {
  assert.equal(catalog.contacts.accepts_payment, false);
  const urls = [
    catalog.site_url,
    ...catalog.offers.flatMap(x => ['page','endpoint','free_sample_url','merchant_docs','buyer_guide'].map(k=>x[k]).filter(Boolean)),
    catalog.contacts.form,
  ];
  for (const url of urls) assert.ok(url.startsWith('https://'), url);
  assert.doesNotMatch(JSON.stringify(catalog), /PRIVATE KEY|secret recovery phrase\s*:/i);
});
