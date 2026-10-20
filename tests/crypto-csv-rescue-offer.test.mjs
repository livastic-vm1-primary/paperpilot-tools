import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=name=>readFileSync(new URL('../'+name,import.meta.url));
const page=get('crypto-csv-rescue.html').toString('utf8');
const css=get('crypto-csv-rescue.css').toString('utf8');
const services=get('services.html').toString('utf8');
const contact=get('contact.html').toString('utf8');
const contactJS=get('contact.js').toString('utf8');
const tradeid=get('tradeid-audit.html').toString('utf8');
const llms=get('llms.txt').toString('utf8');
const sitemap=get('sitemap.xml').toString('utf8');
const offers=JSON.parse(get('catalog.json').toString('utf8')).offers;
const demo=JSON.parse(get('docs/crypto-csv-rescue-fictional-50.json').toString('utf8'));
const csv=get('docs/crypto-csv-rescue-fictional-50-exceptions.csv').toString('utf8');
const id='crypto-csv-rescue-49usd-50row-private-scope-proposal';
const listing=offers.find(x=>x.id===id);
const inquiry='contact.html?service=crypto-csv-rescue';
test('original standalone page clearly says free sample, optional private paid pilot is not a sale',()=>{
 assert.match(page,/Crypto CSV Rescue/);
 assert.match(page,/50 fabricated records/);
 assert.match(page,/\$49/);
 assert.match(page,/A free inquiry is\s*<strong>not<\/strong>\s*a contract or a payment/);
 assert.match(page,/No independent customer order or purchase/);
 assert.doesNotMatch(page,/Already paid by|sold out|currently accepting instant payments/i);
});
test('download sample uses only original static local first-party fictional resources',()=>{
 assert.ok(page.includes('href="docs/crypto-csv-rescue-fictional-50.json"'));
 assert.ok(page.includes('href="docs/crypto-csv-rescue-fictional-50-exceptions.csv"'));
 assert.equal(demo.fictional,true);
 assert.equal(demo.notRealCustomer,true);
 assert.equal(demo.normalizedAudit.rowCount,50);
 assert.equal(demo.normalizedAudit.verifiedCustomerPayments,0);
 assert.equal(demo.normalizedAudit.walletInteractions,0);
 assert.equal(demo.normalizedAudit.reconstructedCostBasis,false);
});
test('all 50 completely fabricated rows have no private customer name or email fields',()=>{
 assert.equal(demo.normalizedAudit.rows.length,50);
 for(const row of demo.normalizedAudit.rows){
   assert.ok(row.entry_id.startsWith('SYN'));
   assert.equal(row.automaticTaxCategoryAssigned,false);
   assert.equal(row.chainTransferVerified,false);
   assert.equal(row.customerOwnershipVerified,false);
   for(const k of ['customer_name','email','wallet_seed','passport_number','api_key'])
     assert.equal(Object.hasOwn(row,k),false);
 }
});
test('fictional exception CSV has one header and fifty nonverified rows',()=>{
 const lines=csv.split(/\r?\n/).filter(Boolean);
 assert.equal(lines.length,51);
 assert.ok(lines[0].startsWith('"Row","Source","Entry ID"'));
 assert.equal((csv.match(/LOCAL INPUT ONLY, NO TAX OR WALLET VERIFICATION/g)||[]).length,50);
});
test('manual scope distinct from original 15-USDC single trade-ID review',()=>{
 assert.ok(page.includes('15 Base USDC Trade-ID-only review'));
 assert.ok(page.includes('broader'));
 assert.ok(services.includes('id="tradeid-review"'));
 assert.ok(services.includes('id="crypto-csv-rescue"'));
 assert.ok(tradeid.includes('href="crypto-csv-rescue.html"'));
 assert.ok(services.includes(inquiry));
});
test('current direct contact form uses already-existing owner-activated provider not new login or a wallet',()=>{
 assert.ok(contact.includes('value="Crypto CSV Rescue multi-export 50-row pilot (49 USD indicative)"'));
 assert.ok(contactJS.includes("'crypto-csv-rescue': 'Crypto CSV Rescue multi-export 50-row pilot (49 USD indicative)'"));
 assert.ok(contact.includes('action="https://formsubmit.co/onecursor1@gmail.com"'));
 assert.match(contact,/name="third_party_form_consent"[^>]*required/);
 assert.ok(page.includes(inquiry));
 assert.doesNotMatch(contactJS,/fetch\s*\(|window\.ethereum|\.submit\s*\(/);
});
test('static page has no confidential CSV upload or signed wallet code',()=>{
 assert.doesNotMatch(page,/<input[^>]+type="file"|<textarea|payment-signature|fetch\s*\(/i);
 assert.doesNotMatch(page,/<script\b|window\.ethereum|sendTransaction|signTypedData/);
 assert.match(page,/Do not send transaction histories|never paste private exchange CSV|Never send a private CSV/i);
});
test('catalog accurately labels proposed price, zero independent orders and nonverified market interest',()=>{
 assert.ok(listing);
 assert.equal(listing.indicative_price_usd,'49.00');
 assert.equal(listing.confirmed_buyer_orders,0);
 assert.equal(listing.new_customer_funds_usdc,'0');
 assert.equal(listing.price_is_confirmed_customer_purchase,false);
 assert.equal(listing.market_is_validated_to_buy_our_service,false);
 assert.equal(listing.uploads_or_wallet_interactions,false);
 assert.equal(listing.maximum_source_rows,50);
});
test('sitemap and agent documentation make discoverable one canonical buyer page',()=>{
 assert.equal((sitemap.match(/crypto-csv-rescue\.html/g)||[]).length,1);
 assert.ok(llms.includes('crypto-csv-rescue.html'));
 assert.ok(page.includes('rel="canonical"'));
 assert.ok(page.includes('https://livastic-vm1-primary.github.io/paperpilot-tools/crypto-csv-rescue.html'));
});
test('responsive CSS and static accessible navigation have no tracking',()=>{
 assert.match(css,/@media\(max-width:820px\)/);
 assert.match(page,/aria-label="Services"/);
 assert.match(page,/class="skip" href="#main"/);
 assert.doesNotMatch(page,/google-analytics|gtag\(|pixel|beacon|sentry|gtm.js/i);
});
test('none of the website artifacts incorrectly promises actual paid customer',()=>{
 assert.ok(page.includes('paid-order and settled-receipt count for this new service is zero'));
 assert.ok(services.includes('NO verified funded order'));
 assert.ok(llms.includes('Zero verified paying users of this pilot'));
});
