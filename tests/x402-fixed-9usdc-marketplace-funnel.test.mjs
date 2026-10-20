import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const site=readFileSync(new URL("../x402-inspector.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../x402-inspector.js",import.meta.url),"utf8");
const services=readFileSync(new URL("../services.html",import.meta.url),"utf8");
const catalog=JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
const docs=readFileSync(new URL("../docs/X402_RESPONSE_HEADER_BUDGET.md",import.meta.url),"utf8");
const llms=readFileSync(new URL("../llms.txt",import.meta.url),"utf8");
const url="https://clawlancer.ai/marketplace/e072b639-4235-428f-89ad-966c0682dbf9";
const offer=catalog.offers.filter(x=>x.id==="paid-x402-header-budget-private-report-9usdc");
test("one and only one true fixed first-party seller SKU at exact nominal 9 native Base USDC",()=>{
 assert.equal(offer.length,1);
 assert.equal(offer[0].price_native_circle_base_usdc,"9.000000");
 assert.equal(offer[0].listing_type,"FIXED");
 assert.equal(offer[0].public_url,url);
 assert.equal(offer[0].confirmed_paid_buyer_orders,0);
 assert.equal(offer[0].confirmed_settled_released_usdc,"0");
 assert.equal(offer[0].escrow_guaranteed_settled,false);
});
test("free inspector is still public-only, CTA distinctly buyer optional",()=>{
 assert.match(site,/This browser preview is free forever/);
 assert.ok(site.includes(url));
 assert.match(site,/completed orders|zero purchases|zero purchase|zero orders/i);
 assert.ok(ui.includes(url));
 assert.match(ui,/wire\.exceeds8KiB/);
 assert.match(ui,/breakdown\.hypotheticalNonAdditiveRankedCandidates\.length/);
 assert.doesNotMatch(ui,/fetch\s*\(|window\.ethereum|sendTransaction|signTypedData/);
});
test("paid SKU is constrained to private written nonconfidential public header",()=>{
 assert.ok(services.includes(url));
 assert.match(services,/One PUBLIC unsigned x402 v2 header size/);
 assert.match(services,/received payment remain zero/);
 assert.match(catalog.offers.find(x=>x.id==="paid-x402-header-budget-private-report-9usdc").scope,/buyer must approve safe content/);
 assert.equal(offer[0].private_customer_data_permitted,false);
});
test("documentation and agent catalog point to same actual paid listing and synthetic sample",()=>{
 for(const text of [docs,llms]) assert.ok(text.includes(url));
 assert.match(docs,/free browser analysis remains free/);
 assert.match(llms,/ZERO orders and payout/);
 assert.match(catalog.offers.find(x=>x.id==="paid-x402-header-budget-private-report-9usdc").fictional_sample,/FICTIONAL_SAMPLE\.json/);
});
