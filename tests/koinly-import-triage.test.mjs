import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plans, validIds, getPlan, safeId} from '../koinly-import-triage.mjs';
const page = readFileSync(new URL('../koinly-import-triage.html', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../koinly-import-triage-ui.mjs', import.meta.url), 'utf8');
const map = readFileSync(new URL('../koinly-column-mapper.html', import.meta.url), 'utf8');
const sales = readFileSync(new URL('../crypto-csv-rescue.html', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
test('five genuinely different importer symptoms, with official HTTPS docs and concrete safe steps', () => {
 assert.deepEqual([...validIds].sort(), ['duplicates','missing','rejected','skipped','strike-2026']);
 for (const [id, plan] of Object.entries(plans)) {
  assert.ok(page.includes('value="'+id+'"'));
  assert.equal(plan.steps.length, 3);
  assert.match(plan.source, /^https:\/\/support\.koinly\.io\/en\/articles\//);
  assert.equal(new Set(plan.steps).size, 3);
  assert.ok(plan.steps.every(s => s.length > 40));
 }
});
test('query parameters cannot select prototype or arbitrary URL; no dynamic HTML injection', () => {
 assert.equal(safeId('__proto__'), 'skipped');
 assert.equal(safeId('constructor'), 'skipped');
 assert.equal(safeId('<script>'), 'skipped');
 assert.equal(getPlan('__proto__'), plans.skipped);
 assert.equal(getPlan('duplicates'), plans.duplicates);
 assert.match(ui, /textContent/);
 assert.doesNotMatch(ui, /innerHTML|document\.write|eval\(/);
});
test('strict no-upload policy and no private input or external tracking', () => {
 assert.match(page, /connect-src 'none'/);
 assert.match(page, /form-action 'none'/);
 assert.match(page, /No CSV upload/);
 assert.doesNotMatch(page, /<input\s+type=["']file|<textarea|<form\b|fetch\(|XMLHttpRequest|sendBeacon|analytics\.js/i);
 assert.doesNotMatch(ui, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|navigator\.sendBeacon|wallet/i);
});
test('human sale remains inquiry first; no self-buy, onchain transfer, auto-payment or false customer claims', () => {
 assert.match(page, /5 Base USDC/);
 assert.match(page, /before payment/);
 assert.match(page, /No third-party customer purchase/);
 assert.match(page, /not a paid order/);
 assert.match(page, /contact\.html\?service=koinly-mini-5/);
 assert.doesNotMatch(page, /ethereum\.request|window\.ethereum|eth_sendTransaction/);
});
test('search discovery and crosslinks are in original first-party repo', () => {
 assert.equal((sitemap.match(/koinly-import-triage\.html/g)||[]).length,1);
 assert.match(map, /href="koinly-import-triage\.html"/);
 assert.match(sales,/href="koinly-import-triage\.html"/);
 assert.match(page,/rel="canonical"/);
});
test('source facts and exclusions are plainly visible', () => {
 for (const x of ['Missing purchase history', 'Skipped rows', 'CSV duplicates', 'Rejected', 'tax advice']) assert.match(page, new RegExp(x, 'i'));
 assert.match(page,/not affiliated with Koinly/);
});
