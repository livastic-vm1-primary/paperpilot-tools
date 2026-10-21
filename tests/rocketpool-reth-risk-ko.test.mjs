import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html=readFileSync(new URL("../rocketpool-reth-risk-ko.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../rocketpool-reth-risk-ko.css",import.meta.url),"utf8");
const site=readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
const llms=readFileSync(new URL("../llms.txt",import.meta.url),"utf8");

test("Korean free-first preview blocks all script, outbound network and buyer form interactions",()=>{
 assert.match(html,/<html lang="ko">/);
 for(const d of ["default-src 'none'","style-src 'self'","script-src 'none'",
   "connect-src 'none'","form-action 'none'","object-src 'none'"]){
   assert.ok(html.includes(d),"Missing CSP: "+d);
 }
 for(const forbidden of [/<script\b/i,/<form\b/i,/<iframe\b/i,/\bfetch\s*\(/i,
   /\blocalStorage\b/i,/\bsessionStorage\b/i,/\bnavigator\.clipboard\b/i,
   /\bwindow\.ethereum\b/i,/\bonclick\s*=/i]){
   assert.doesNotMatch(html,forbidden);
 }
});
test("four source backed no-wallet safety decisions",()=>{
 assert.equal((html.match(/<article class="card"/g)||[]).length,4);
 assert.equal((html.match(/<input type="checkbox">/g)||[]).length,4);
 for(const key of ["route","network","approval","exit"])
   assert.ok(html.includes("id="+JSON.stringify(key)));
 assert.match(html,/즉시 중단/);
 assert.match(html,/슬리피지/);
 assert.match(html,/출금 유동성/);
 assert.match(html,/토큰 주소가 맞는가/);
});
test("official referenced evidence is exact, source anchors cannot be broken",()=>{
 for(const src of ["source-routing","source-l2","source-contracts","source-faq"]){
   assert.equal(html.split('id="'+src+'"').length-1,1);
 }
 for(const [id,uri] of [
  ["S1","https://docs.rocketpool.net/liquid-staking/via-rp.html"],
  ["S2","https://docs.rocketpool.net/liquid-staking/via-l2.html"],
  ["S3","https://docs.rocketpool.net/protocol/contracts-integrations"],
  ["S4","https://docs.rocketpool.net/protocol/faq/"]
 ]){
   assert.ok(html.includes('data-source-id="'+id+'"'));
   assert.ok(html.includes('href="'+uri+'"'));
 }
 for(const ref of [...html.matchAll(/href="#(source-[a-z0-9-]+)"/g)]){
   assert.ok(html.includes('id="'+ref[1]+'"'),"broken source ref "+ref[1]);
 }
});
test("no claimed funded grant, live investment return, buyer or wallet control",()=>{
 assert.match(html,/아직 선정·지급되지 않았습니다/);
 assert.match(html,/미승인·미지급/);
 assert.match(html,/2026-10-21/);
 assert.match(html,/CC BY 4.0/);
 assert.doesNotMatch(html,/(\bAPR\s*\d|확정 수익률|추천 매수가|0x[0-9a-f]{40})/i);
});
test("existing firstparty application and feedback paths are not purchase paths",()=>{
 assert.ok(html.includes("https://dao.rocketpool.net/t/4070/8"));
 assert.ok(html.includes("https://dao.rocketpool.net/t/4069/2"));
 assert.match(html,/one human economic owner/);
 assert.match(html,/개인정보/);
 assert.doesNotMatch(html,/<input[^>]*name=/);
});
test("accessible and responsive read-only print layout",()=>{
 assert.match(html,/<a class="skip" href="#main">/);
 assert.match(html,/<main id="main">/);
 assert.match(html,/<caption>/);
 assert.match(html,/<th scope="row">/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media print/);
 assert.match(css,/prefers-reduced-motion/);
});
test("original discovery files expose one actual source-dated preview",()=>{
 const uri="https://livastic-vm1-primary.github.io/paperpilot-tools/rocketpool-reth-risk-ko.html";
 assert.equal(site.split("<loc>"+uri+"</loc>").length-1,1);
 assert.equal(llms.split(uri).length-1,1);
 assert.match(llms,/not awarded|NOT awarded|unawarded/i);
});
