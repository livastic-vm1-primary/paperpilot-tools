import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const order = readFileSync(new URL('../order.html', import.meta.url), 'utf8');
const catalog = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
const label = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const canonical = 'https://livastic-vm1-primary.github.io/paperpilot-tools/';

test('single parseable product metadata references the original owned seller, no obsolete checkout claim', () => {
  assert.equal(label.length, 1);
  const json = JSON.parse(label[0][1]);
  assert.equal(json['@context'], 'https://schema.org');
  assert.equal(json['@type'], 'SoftwareApplication');
  assert.equal(json.url, canonical);
  assert.equal(json.softwareHelp, canonical + 'guide.html');
  assert.ok(json.description.includes('manual inquiry'));
  assert.equal('offers' in json, false, 'do not quote a fictitious 12 USD PreOrder or a verified automated checkout');
  assert.doesNotMatch(label[0][1], /\b12\.00\b|PreOrder/i);
  assert.ok(json.description.includes('no instant checkout'));
});

test('published manual buyer terms and canonical catalog agree on 5 native Base Circle USDC', () => {
  const item = catalog.offers.find(o => o.id === 'manual-paperpilot-offline-kit');
  assert.ok(item);
  assert.equal(item.type, 'manual-inquiry-only');
  assert.equal(item.indicative_price_native_base_circle_usdc, '5.000000');
  assert.equal(item.instant_checkout, false);
  assert.equal(item.escrow_available, false);
  assert.equal(item.buyer_written_agreement_required, true);
  assert.ok(order.includes('5 <span class="unit">native Circle USDC'));
  assert.ok(order.includes('No payment is requested until the seller accepts the exact terms in writing.'));
  assert.ok(html.includes('Manual 5 USDC order'));
  assert.ok(html.includes('Automated $12 checkout is not live.'));
  assert.ok(order.includes('https://livastic-vm1-primary.github.io/paperpilot-tools/order.html'));
});

test('public URL and free buyer demo remain stable for existing seller pilot', () => {
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'));
  assert.ok(html.includes('href="#demo"'));
  assert.ok(html.includes('href="order.html"'));
  assert.ok(html.includes('<meta property="og:image" content="'+canonical+'cover.svg">'));
});
