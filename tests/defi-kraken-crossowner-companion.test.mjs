import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const defi=read('../defi-exception-inbox.html');
const home=read('../index.html');
const csv=read('../csv-quality-api.html');
const llms=read('../llms.txt');
const cat=JSON.parse(read('../catalog.json'));
const source='https://livastic-vm3-primary-tmp-260920.github.io/defi-payment-proof-qa/guides/crypto-transfer-csv-pair-auditor.html';

test('VM1 free existing DeFi scanner remains visible and unchanged at its core',()=>{
  assert.match(defi,/id="defi-csv"/);
  assert.match(defi,/id="defi-run"/);
  assert.match(defi,/defi-review-core\.js/);
  assert.match(defi,/connect-src 'none'/);
});
test('the distinct owner VM3 real free two-export tool is linked as separate site without auto upload',()=>{
  assert.ok(defi.includes(source));
  assert.match(defi,/id="two-csv-kraken-bridge"/);
  assert.match(defi,/target="_blank" rel="noopener noreferrer"/);
  assert.match(defi,/Following the link sends NO CSV/);
  assert.match(defi,/ONE economic owner/);
});
test('Kraken internal ledger id is explicitly not a blockchain transaction and the source is cited',()=>{
  assert.match(defi,/internal Kraken ledger ID/);
  assert.match(defi,/NOT an independently finalized blockchain transaction hash/);
  assert.match(defi,/https:\/\/support\.kraken\.com\/hc\/articles\/360001169383-how-to-interpret-ledger-history-fields/);
  assert.match(defi,/reconstructs tax lots/);
});
test('real buyer problem and exporter categories include Kraken and missing second transfer leg',()=>{
  assert.match(defi,/<option value="missing_transfer_pair">/);
  assert.match(defi,/<option value="kraken_ledger">/);
  assert.match(defi,/id="feedback-third-party-consent"/);
  assert.match(defi,/required/);
  assert.match(defi,/No independently paid customers|No completed paid customer|paid customers have NOT/);
});
test('landing and free CSV entry now surface crypto users instead of burying standalone product',()=>{
  assert.match(home,/href="defi-exception-inbox\.html">DeFi CSV review/);
  assert.match(csv,/href="defi-exception-inbox\.html">DeFi exception review/);
  assert.match(llms,/Free two-export crypto transfer candidate review/);
});
test('catalog clearly labels free peer operator, not new paid enterprise or false customer',()=>{
  const recs=cat.offers.filter(x=>x.id==='free-crypto-two-csv-transfer-review-one-owner-vm3');
  assert.equal(recs.length,1);
  const v=recs[0];
  assert.equal(v.page,source);
  assert.equal(v.price_native_circle_base_usdc,'0.000000');
  assert.equal(v.confirmed_external_paid_customers,0);
  assert.equal(v.kraken_internal_ledger_id_is_onchain_hash,false);
  assert.equal(v.wallet_connection,false);
  assert.match(v.operator,/SAME one human economic owner/);
});
test('existing 15 USDC manual EVM pilot remains conditional and not counted as revenue',()=>{
  const v=cat.offers.find(x=>x.id==='manual-defi-transaction-exception-review-15usdc');
  assert.equal(v.price_native_circle_base_usdc,'15.000000');
  assert.equal(v.confirmed_paid_customers,0);
  assert.equal(v.checkout_status,'MANUAL_SCOPE_AGREEMENT_BEFORE_PAYMENT');
});
test('no new payment signature or arbitrary fetch introduced in VM1 free tool',()=>{
  const s=read('../defi-review-ui.js');
  assert.doesNotMatch(s,/window\.ethereum/);
  assert.doesNotMatch(s,/fetch\s*\(/);
  assert.match(defi,/No wallet connection/);
  assert.match(defi,/no blockchain API/);
});
