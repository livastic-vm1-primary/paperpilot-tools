import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plans,getPlan,safeId} from '../koinly-import-triage.mjs';
const html=readFileSync(new URL('../koinly-import-triage.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../koinly-import-triage-ui.mjs',import.meta.url),'utf8');
const pageData=readFileSync(new URL('../koinly-import-triage.mjs',import.meta.url),'utf8');
const llms=readFileSync(new URL('../llms.txt',import.meta.url),'utf8');

test('real Oct 12 Strike iOS independent user error is accurately attributed, not declared universally confirmed',()=>{
  assert.match(html,/strike-exchange-csv-file-appears-to-have-changed-october-2026\/28630/);
  assert.match(html,/October 12, 2026/);
  assert.match(html,/one unresolved user report, not a confirmed format-change announcement/);
  assert.match(plans['strike-2026'].explanation,/one user report, not proof of a universally changed Strike schema/);
});
test('supported export Unknown file must be escalated to first party Koinly support first',()=>{
  const r=plans['strike-2026'];
  assert.equal(r.source,'https://support.koinly.io/en/articles/9885319-how-to-modify-csv-files-to-import-them-to-koinly');
  assert.match(r.steps.join(' '),/contact Koinly support through the official application\/chat/);
  assert.match(r.steps.join(' '),/Do NOT blindly rename headers/);
  assert.match(r.steps.join(' '),/original Strike iOS export unchanged/);
  assert.match(r.offer,/NOT a recommended first step/);
});
test('full original free CSV paths still exist with no auto-modification or hidden premium redirect',()=>{
  assert.ok(plans.skipped && plans.duplicates && plans.missing && plans.rejected);
  assert.deepEqual([...Object.keys(plans)].sort(),['duplicates','missing','rejected','skipped','strike-2026']);
  assert.match(html,/value="strike-2026"/);
  assert.match(html,/href="\?issue=strike-2026#triage"/);
  assert.match(html,/5 Base USDC/);
  assert.match(html,/No third-party customer purchase/);
});
test('plan selector cannot fetch remote CSV, change a wallet, rewrite transactions or accept arbitrary JSON',()=>{
  assert.equal(safeId('strike-2026'),'strike-2026');
  assert.equal(getPlan('__proto__'),getPlan('skipped'));
  assert.equal(safeId('strike-2026<script>'),'skipped');
  assert.match(js,/textContent/);
  assert.match(js,/steps\.replaceChildren/);
  assert.doesNotMatch(js+pageData,/XMLHttpRequest|fetch\s*\(|innerHTML|eval\s*\(/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.doesNotMatch(html,/<form\b|<input[^>]+type="file"/);
});
test('no fabricated concrete Strike header mapping or supposed paid client',()=>{
  assert.doesNotMatch(plans['strike-2026'].offer,/we already fixed|our client was paid|guaranteed working/);
  assert.match(plans['strike-2026'].offer,/No paid buyer/);
  assert.match(plans['strike-2026'].steps.join(' '),/without account numbers, amounts, addresses/);
  assert.match(html,/not affiliated with Koinly/);
  assert.match(html,/not legal, accounting or tax advice/i);
});
test('AI-readable discovery reinforces supported-file policy, not an unsourced migration script',()=>{
  assert.match(llms,/FREE support-first Strike iOS CSV Unknown file diagnostic/);
  assert.match(llms,/no confirmed changed schema/);
  assert.match(llms,/no.*paid customer or service purchase/);
});
test('official references are HTTPS, immutable text and only one supported-source plan',()=>{
  assert.equal(plans['strike-2026'].steps.length,3);
  assert.ok(plans['strike-2026'].steps.every(s=>s.length>70));
  assert.equal(new Set(plans['strike-2026'].steps).size,3);
  assert.match(plans['strike-2026'].source,/^https:\/\/support\.koinly\.io\//);
  assert.ok(Object.isFrozen(plans['strike-2026']));
  assert.ok(Object.isFrozen(plans['strike-2026'].steps));
});
