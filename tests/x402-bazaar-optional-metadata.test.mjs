import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {analyze,inspectOptionalMetadataSize,TEST_FIXTURE}=require("../x402-inspector-core.js");
const base=()=>structuredClone(TEST_FIXTURE);
const fictional=()=>{
 const quote=base();
 quote.extensions={bazaar:{info:{input:{example:"x".repeat(900)},output:{example:"y".repeat(7200),schema:{status:"string",notes:"n".repeat(900)}},short:"small"}}};
 return quote;
};
test("large fictional output dominates ranked single-field removal proposals",()=>{
 const quote=fictional(),original=structuredClone(quote),r=analyze(JSON.stringify(quote));
 const candidates=r.optionalMetadataBudget.hypotheticalNonAdditiveRankedCandidates;
 assert.ok(candidates.length>0);
 assert.equal(candidates[0].path,"extensions.bazaar.info.output");
 assert.ok(candidates[0].hypotheticalHeaderBytesSaved>9000);
 assert.ok(candidates[0].hypotheticalHeaderLineBytesAfter<r.optionalMetadataBudget.originalCompactJsonHeaderLineBytes);
 assert.equal(r.transportHeaderBudget.exceeds8KiB,true);
 assert.deepEqual(quote,original);
 assert.equal(r.networkRequests,0);
 assert.equal(r.walletInteraction,false);
 assert.equal(r.onchainSettlementVerified,false);
});
test("every individual estimate recomputes precisely without editing accept/payment",()=>{
 const quote=fictional();
 const out=inspectOptionalMetadataSize(quote);
 const bytes=value=>Math.ceil(Buffer.byteLength(JSON.stringify(value),"utf8")/3)*4+20;
 for (const candidate of out.hypotheticalNonAdditiveRankedCandidates){
  const next=structuredClone(quote);const path=candidate.path.split(".");
  let node=next;for(const key of path.slice(0,-1))node=node[key];
  delete node[path.at(-1)];
  assert.equal(candidate.hypotheticalHeaderBytesSaved,bytes(quote)-bytes(next));
  assert.equal(candidate.hypotheticalHeaderLineBytesAfter,bytes(next));
  assert.deepEqual(next.accepts,quote.accepts);
 }
 assert.equal(out.otherFieldsUntouched,true);
 assert.equal(out.proposalOnlyNoQuoteMutation,true);
 assert.equal(out.vendorCompatibilityGuaranteed,false);
 assert.match(out.warning,/must not be summed/);
});
test("normal unadorned 402 quote does not invent Bazaar savings candidates",()=>{
 const r=analyze(JSON.stringify(base()));
 assert.equal(r.optionalMetadataBudget.hypotheticalNonAdditiveRankedCandidates.length,1);
 assert.equal(r.optionalMetadataBudget.hypotheticalNonAdditiveRankedCandidates[0].path,"resource.description");
});
test("malformed non-Bazaar and suspicious property names never leak raw values",()=>{
 const q=base();
 q.extensions={bazaar:{info:{'<script>":"secret-token"':"supersecret",output:{example:"x".repeat(2200)},unused:null}}};
 const report=analyze(JSON.stringify(q));
 const c=report.optionalMetadataBudget.hypotheticalNonAdditiveRankedCandidates;
 assert.equal(c.some(x=>x.path.includes("<script>")),false);
 assert.doesNotMatch(JSON.stringify(report.optionalMetadataBudget),/supersecret|<script>/);
 assert.ok(c.length<=6);
});
test("UTF8 JSON and big array values use base64-rounded header simulation",()=>{
 const q=base();q.extensions={bazaar:{info:{input:{example:"가".repeat(250)},output:Array(100).fill("large")}}};
 const v=analyze(JSON.stringify(q)).optionalMetadataBudget;
 assert.ok(v.hypotheticalNonAdditiveRankedCandidates.some(x=>x.path==="extensions.bazaar.info.output"));
 assert.ok(v.hypotheticalNonAdditiveRankedCandidates.every(x=>x.hypotheticalHeaderBytesSaved>0));
});
test("page is offline: no wallet fetch, still links separately consented merchant QA",()=>{
 const core=readFileSync(new URL("../x402-inspector-core.js",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../x402-inspector.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../x402-inspector.html",import.meta.url),"utf8");
 assert.match(ui,/report\.optionalMetadataBudget/);
 assert.match(page,/ranked hypothetical byte-saving breakdown/);
 assert.match(core,/Never edit or truncate a live payment challenge automatically/);
 assert.doesNotMatch(ui,/fetch\s*\(|window\.ethereum|sendTransaction|signTypedData|innerHTML/);
 assert.match(page,/href="services.html#x402-audit"/);
});
