import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {analyze,inspectTransportHeader,TEST_FIXTURE,MAX_BYTES}=require("../x402-inspector-core.js");
const q=()=>structuredClone(TEST_FIXTURE);
const encoded=v=>Buffer.from(JSON.stringify(v),"utf8").toString("base64");

test("real supplied public Base64 value uses observed bytes and HTTP/1 field line cost",()=>{
  const value=encoded(q());
  const plain=analyze("PAYMENT-REQUIRED: "+value);
  const inResponse=analyze("HTTP/1.1 402 Payment Required\r\nPAYMENT-REQUIRED: "+value+"\r\n");
  for(const r of [plain,inResponse]){
    assert.equal(r.transportHeaderBudget.method,"observed-public-header");
    assert.equal(r.transportHeaderBudget.paymentRequiredValueBytes,value.length);
    assert.equal(r.transportHeaderBudget.estimatedHttp1HeaderLineBytes,value.length+20);
    assert.equal(r.transportHeaderBudget.compatibilityGuaranteed,false);
    assert.equal(r.transportHeaderBudget.totalOtherResponseHeadersIncluded,false);
    assert.equal(r.networkRequests,0);
    assert.equal(r.walletInteraction,false);
  }
});

test("JSON input reports only prospective compact JSON encoding, not observed wire bytes",()=>{
 const pretty=JSON.stringify(q(),null,2);
 const wire=analyze(pretty).transportHeaderBudget;
 assert.equal(wire.method,"compact-json-estimate");
 assert.equal(wire.paymentRequiredValueBytes,encoded(q()).length);
 assert.equal(wire.estimatedHttp1HeaderLineBytes,encoded(q()).length+20);
 assert.match(wire.note,/not verified/);
});

test("checks 2K, 8K and 16K boundaries without claiming transport compatibility",()=>{
 // Padding uses an optional resource metadata property and deterministic fictional bytes.
 const make=n=>{const x=q();x.extensions={bazaar:{info:{fictionalExample:"x".repeat(n)}}};return x;};
 for(const [n,expected] of [[100,false],[1600,true],[6100,true],[12300,true]]){
   const quote=make(n);
   const result=analyze(encoded(quote));
   const b=result.transportHeaderBudget;
   assert.equal(b.exceeds2KiB,expected,JSON.stringify({n,b}));
   if(n===100)assert.equal(b.risk,"BELOW_2K_NOT_CERTIFIED");
   if(n===1600){ assert.equal(b.exceeds8KiB,false); assert.equal(b.risk,"REVIEW_2K_PLUS"); }
   if(n===6100){ assert.equal(b.exceeds8KiB,true);assert.equal(b.exceeds16KiB,false);assert.equal(b.risk,"HIGH_8K_PLUS"); }
   if(n===12300){assert.equal(b.exceeds16KiB,true);assert.equal(b.risk,"SEVERE_16K_PLUS");}
 }
});

test("UTF-8 escaped nonascii metadata is counted in JSON serialization byte estimate",()=>{
 const quote=q(); quote.resource.description="가".repeat(400);
 const b=analyze(JSON.stringify(quote)).transportHeaderBudget;
 assert.equal(b.paymentRequiredValueBytes,encoded(quote).length);
 assert.equal(b.method,"compact-json-estimate");
});

test("actual Base64+JSON same semantically valid fields, independent of quote amount and payment",()=>{
 const data=q();data.accepts[0].amount="10000";data.error="PAYMENT-SIGNATURE required";
 const r=analyze(encoded(data),"0.02");
 assert.equal(r.options[0].amountUSDC,"0.010000");
 assert.equal(r.merchantReportedError,data.error);
 assert.equal(r.networkRequests,0);
 assert.equal(r.chargedUSDC,"0");
 assert.equal(r.onchainSettlementVerified,false);
});

test("local tool refuses oversized input and signed private credential headers",()=>{
 assert.throws(()=>analyze('PAYMENT-SIGNATURE: '+ 'A'.repeat(30)),/private signed/);
 assert.throws(()=>analyze('PAYMENT-REQUIRED: ' + 'A'.repeat(MAX_BYTES+3)),/32 KiB/);
});
test("page and renderer disclose free public-only report plus limitation, no network or wallet code",()=>{
 const html=readFileSync(new URL("../x402-inspector.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../x402-inspector.js",import.meta.url),"utf8");
 assert.match(html,/transport warnings/);
 assert.match(html,/https:\/\/github.com\/x402-foundation\/x402\/issues\/3803/);
 assert.match(js,/report\.transportHeaderBudget/);
 assert.match(js,/not a universal x402 size limit/);
 assert.doesNotMatch(js,/fetch\s*\(|window\.ethereum|signTypedData|sendTransaction/);
});
