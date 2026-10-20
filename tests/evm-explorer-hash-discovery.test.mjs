import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const src = 'examples/evm-explorer-hash-preflight/preflight.py';
const read = file => readFileSync(file, 'utf8');

test('standalone free Python demo returns hash lookup candidate counts, never transfer-row deletion', () => {
  const data = JSON.parse(execFileSync('python3',[src,'--demo','--chain','8453'],{encoding:'utf8',timeout:5000}));
  assert.equal(data.ok, true);
  assert.equal(data.report.total_rows,3);
  assert.equal(data.report.unique_hashes_for_rpc_discovery_only,2);
  assert.equal(data.report.repeated_hash_discovery_rows_NOT_duplicate_economic_events,1);
  assert.equal(data.report.authorization_to_delete_duplicate_event_rows,false);
  assert.equal(data.report.completeness_or_used_query_ranges_proven,false);
  assert.equal(data.report.raw_identifiers_in_report,false);
});
test('public catalogue and README link to original source, no external adoption claim', () => {
  const catalog = JSON.parse(read('catalog.json'));
  const found=catalog.offers.find(x=>x.id==='free-evm-explorer-hash-discovery');
  assert.ok(found);
  assert.equal(found.price_usdc,'0.000000');
  assert.equal(found.no_upload,true);
  assert.equal(found.external_rotki_maintainer_adoption_or_commission_proven,false);
  assert.match(read('README.md'), /Free EVM explorer CSV hash-discovery preflight/);
  assert.match(read('llms.txt'), /Free offline EVM explorer CSV hash-discovery reference/);
  assert.match(read('examples/evm-explorer-hash-preflight/README.md'), /NOT requested, paid for, reviewed/);
});
