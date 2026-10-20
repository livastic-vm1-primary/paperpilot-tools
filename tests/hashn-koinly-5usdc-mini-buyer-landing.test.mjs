import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const page='https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/koinly-csv-one-source-mapping-mini-review-5usdc.md';

test('free original Koinly mapper visibly links real newly-published same-owner optional mini HashN offer',()=>{
 const s=read('koinly-column-mapper.html');
 assert.ok(s.includes('href="'+page+'"'));
 assert.match(s,/5 native Circle USDC mini-review/);
 assert.match(s,/10 data rows/);
 assert.match(s,/HashN mini-review \(contact seller first\)/);
 assert.match(s,/not.*order or payment/);
 assert.match(s,/Koinly importer acceptance/);
 assert.match(s,/49 USD \/ up to 50-row/);
 assert.match(s,/unproven hypotheses, not accepted orders or paid customers/);
 assert.match(s,/No tax|no tax|tax correctness/);
});
test('original larger Crypto CSV Rescue sales page distinguishes two products and no automatic checkout',()=>{
 const s=read('crypto-csv-rescue.html');
 assert.ok(s.includes('href="'+page+'"'));
 assert.match(s,/5 native Base Circle USDC mini-review/);
 assert.match(s,/up to 10 redacted synthetic\/example rows/);
 assert.match(s,/not automatic checkout, escrow proof, prior buyer demand/);
 assert.match(s,/49 USD|49-USD|\$49/);
 assert.match(s,/No independent customer order or purchase/);
});
test('catalog machine-readable offer is priced native chain8453 only after buyer consent and 0 confirmed orders',()=>{
 const c=JSON.parse(read('catalog.json'));
 const entry=c.offers.find(x=>x.id==='hashn-koinly-one-source-10row-5usdc');
 assert.ok(entry);
 assert.equal(entry.page,page);
 assert.equal(entry.price_usdc,'5.000000');
 assert.equal(entry.base_native_circle_usdc_chain_id,8453);
 assert.equal(entry.max_authorized_sanitized_source_rows,10);
 assert.equal(entry.auto_checkout_active,false);
 assert.equal(entry.wallet_connection_required_for_first_contact,false);
 assert.equal(entry.requires_prior_written_scope_privacy_payment_and_refund_terms,true);
 assert.equal(entry.koinly_vendor_import_verified,false);
 assert.equal(entry.independent_paid_orders_verified,0);
 assert.equal(entry.independent_base_usdc_payments_received_for_this_listing,'0.000000');
 assert.equal(entry.separate_49usd_up_to_50_row_pilot_is_same_product,false);
});
test('public README and AI discovery explicitly preserve existing free tools and all price/revenue distinctions',()=>{
 const s=read('README.md');
 const a=read('llms.txt');
 assert.ok(s.includes(page) && a.includes(page));
 assert.match(s,/The new small offer is DIFFERENT from/);
 assert.match(s,/fully free/);
 assert.match(s,/Actual independent paid mini-review customers and settlement: ZERO/);
 assert.match(a,/No Koinly importer\/tax certificate/);
 assert.match(a,/not the separate|Not the separate/);
});
