import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const page=readFileSync(root+'csv-import-audit-service.html','utf8');
const catalog=JSON.parse(readFileSync(root+'catalog.json','utf8'));
const offer=catalog.offers.find(x=>x.id==='manual-csv-import-audit-25usdc-pilot');
function demo(){
 return JSON.parse(execFileSync('python3',[root+'free-tools/csv-import-audit/csv-import-audit.py','--demo'],{encoding:'utf8',timeout:6000,maxBuffer:9000}));
}
test('one authentic bounded human service SKU offered, not asserted paid',()=>{
 assert.ok(offer);assert.equal(offer.indicative_price_native_circle_base_usdc,'25.000000');
 assert.equal(offer.network,'eip155:8453');assert.equal(offer.independently_paid_customers_confirmed,0);
 assert.equal(offer.automatic_wallet_checkout,false);
 assert.equal(offer.checkout_status,'MANUAL_WRITTEN_BUYER_AGREEMENT_ONLY');
 assert.deepEqual(offer.delivery_scope,{files:1,maxBytes:2097152,maxDataRows:10000,maxColumns:25,maxAgreedRules:3,revisions:1});
});
test('new service is distinct from the existing automatic 0.005 USDC buyer-owned API',()=>{
 const tiny=catalog.offers.find(x=>x.id==='vm5-x402-csv-preflight');
 assert.ok(tiny);
 assert.equal(tiny.verified_paid_post_customers,0);
 assert.match(page,/0\.005 USDC x402 API/);
 assert.match(page,/25 USDC/);
 assert.match(page,/separate, optional human-scoped project/);
});
test('free Python sample and inline displayed facts match the real executable',()=>{
 const out=demo();
 assert.deepEqual([out.dataRows,out.columns,out.raggedRows,out.missingCells,out.duplicateRows,out.duplicateHeaders,out.formulaPrefixWarnings],[5,3,1,3,1,0,1]);
 assert.match(page,/Data rows: 5/);assert.match(page,/Missing cells: 3/);
 assert.match(page,/Possible spreadsheet-formula prefixes: 1/);
 assert.match(page,/Upload requests: 0 · Wallet signatures: 0 · Paid amount: 0 USDC/);
});
test('sales CTA only asks for nonconfidential scope by regular mailto, not wallet secrets',()=>{
 assert.match(page,/href="mailto:onecursor1@gmail.com\?subject=/);
 assert.match(page,/No confidential data upload, wallet connection or payment is required/);
 assert.doesNotMatch(page,/\*\*[^*]{4,150}\*\*/);
 assert.match(page,/do not send money until/i);
 assert.doesNotMatch(page,/script src=|eth_sendTransaction|window\.ethereum|localStorage|setInterval|form action="https:/);
});
test('public buyer facing site offers free source without third party tracking',()=>{
 assert.match(page,/href="free-tools\/csv-import-audit\/csv-import-audit.py" download=/);
 assert.match(page,/href="https:\/\/github.com\/livastic-vm1-primary\/paperpilot-tools\/tree\/main\/free-tools\/csv-import-audit"/);
 assert.doesNotMatch(page,/new Promise\(|<script|tracking pixel|google-analytics|gtag\(/i);
});
test('site discovery links from existing buyer, services and sitemap are present exactly once',()=>{
 const buyer=readFileSync(root+'csv-usdc-checkout.html','utf8');
 const services=readFileSync(root+'services.html','utf8');
 const sitemap=readFileSync(root+'sitemap.xml','utf8');
 assert.match(buyer,/href="csv-import-audit-service.html"/);
 assert.match(services,/href="csv-import-audit-service.html"/);
 assert.equal(sitemap.split('csv-import-audit-service.html').length-1,1);
 const guide=readFileSync(root+'llms.txt','utf8');
 assert.match(guide,/CSV import audit — free local script/);
});
