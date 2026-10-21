import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyDirectoryGetPair,probeDirectoryGetPair,UNQUALIFIED_DIRECTORY_URL,VALID_DNS_QUOTE_URL} from '../x402-directory-get-probe-core.mjs';
import {EXPECTED_TOKEN,EXPECTED_RECIPIENT} from '../x402-post-body-diagnostic-core.mjs';

const quote=(patch={})=>{
 const base={x402Version:2,resource:{url:VALID_DNS_QUOTE_URL},accepts:[{
  scheme:'exact',network:'eip155:8453',asset:EXPECTED_TOKEN,amount:'5000',payTo:EXPECTED_RECIPIENT,
 }]};
 if('accepts' in patch)base.accepts=patch.accepts;
 Object.assign(base,Object.fromEntries(Object.entries(patch).filter(([k])=>k!=='accepts')));
 return Buffer.from(JSON.stringify(base)).toString('base64');
};
const clean=()=>classifyDirectoryGetPair(400,402,quote());
const here=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,here),'utf8');

test('known quote reports two entirely unsigned public GETs and ZERO purchased',()=>{
 const r=clean();
 assert.equal(r.ok,true);assert.equal(r.code,'GET_400_VS_GET_402_CONFIRMED');
 assert.equal(r.paid,false);assert.equal(r.signed,false);assert.equal(r.settled,false);
 assert.equal(r.requestsMade,2);assert.equal(r.outsideCustomerSaleProven,false);
 assert.equal(r.quote.nativeBaseCircleUSDC,'0.005000');assert.equal(r.quote.resource,VALID_DNS_QUOTE_URL);
});
test('different first URL status fails closed rather than reporting a broken paywall',()=>{
 for(const code of [200,201,204,401,402,403,404,429,500]){
  const r=classifyDirectoryGetPair(code,402,quote());
  assert.equal(r.ok,false);assert.equal(r.code,'BARE_URL_NOT_400');
  assert.equal(r.paid,false);
 }
});
test('valid URL without real unsigned HTTP402 fails closed',()=>{
 for(const code of [200,201,204,400,401,403,404,429,503]){
  const r=classifyDirectoryGetPair(400,code,quote());
  assert.equal(r.ok,false);assert.equal(r.code,'VALID_DNS_GET_NOT_402');
 }
});
test('missing or nonsense quote header fails safely',()=>{
 for(const h of [null,undefined,'','x','abcde','@@invalid@@','A'.repeat(12001)]){
  assert.equal(classifyDirectoryGetPair(400,402,h).ok,false);
 }
});
test('garbage JSON and non-object signatures never count as a quote',()=>{
 for(const bad of ['{bad','"secret"','[{}]','null']){
  assert.equal(classifyDirectoryGetPair(400,402,Buffer.from(bad).toString('base64')).ok,false);
 }
});
test('exact resource URL is required, same origin is insufficient',()=>{
 for(const url of [UNQUALIFIED_DIRECTORY_URL,'https://vm5-openapi-x402.onrender.com/v1/email-dns-preflight',
   'https://vm5-openapi-x402.onrender.com/v1/email-dns-preflight?domain=other.com','https://example.com']){
   const bad=quote({resource:{url}});
   assert.equal(classifyDirectoryGetPair(400,402,bad).ok,false);
 }
});
test('invalid wallet, token, network, amount, scheme and type fail closed',()=>{
 const base={scheme:'exact',network:'eip155:8453',asset:EXPECTED_TOKEN,
  amount:'5000',payTo:EXPECTED_RECIPIENT};
 const variants=[
  {...base,scheme:'upto'}, {...base,network:'eip155:1'},
  {...base,asset:'0x'+'1'.repeat(40)}, {...base,amount:'50000'},
  {...base,amount:5000},{...base,payTo:'0x'+'2'.repeat(40)},null,[],{},
 ];
 for(const candidate of variants){
  assert.equal(classifyDirectoryGetPair(400,402,quote({accepts:[candidate]})).ok,false);
 }
});
test('x402 v1, zero and multiple accepts are rejected',()=>{
 const base={scheme:'exact',network:'eip155:8453',asset:EXPECTED_TOKEN,
  amount:'5000',payTo:EXPECTED_RECIPIENT};
 for(const p of [{x402Version:1},{accepts:[]},{accepts:[base,base]}]){
  assert.equal(classifyDirectoryGetPair(400,402,quote(p)).ok,false);
 }
});
test('EVM address case normalization does not weaken exact chain and price',()=>{
 const r=classifyDirectoryGetPair(400,402,quote({accepts:[{
  scheme:'exact',network:'eip155:8453',asset:EXPECTED_TOKEN.toUpperCase(),
  amount:'5000',payTo:EXPECTED_RECIPIENT.toUpperCase()
 }]}));
 assert.equal(r.ok,true);
});
test('probe uses ONLY fixed two clean GET requests without signing, authentication, storage or retries',async()=>{
 const calls=[];
 const mock=async(url,opts)=>{
  calls.push({url,opts});
  return {status:calls.length===1?400:402,headers:{get:k=>k==='payment-required'?quote():null}};
 };
 const r=await probeDirectoryGetPair(mock);
 assert.equal(r.ok,true);assert.equal(calls.length,2);
 assert.deepEqual(calls.map(x=>x.url),[UNQUALIFIED_DIRECTORY_URL,VALID_DNS_QUOTE_URL]);
 for(const {opts} of calls){
  assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
  assert.equal(opts.credentials,'omit');assert.equal(opts.referrerPolicy,'no-referrer');
  assert.equal(opts.cache,'no-store');assert.equal(opts.mode,'cors');
  assert.equal(Object.hasOwn(opts,'body'),false);
  assert.equal(Object.hasOwn(opts,'headers'),false);
 }
});
test('one thrown fetch must NOT trigger any second request or retry',async()=>{
 let calls=0;
 await assert.rejects(()=>probeDirectoryGetPair(()=>{calls++;throw Error('CORS');}),/CORS/);
 assert.equal(calls,1);
});
test('second fetch failing does not trigger third call',async()=>{
 let calls=0;
 await assert.rejects(()=>probeDirectoryGetPair(async()=>{if(++calls===2)throw Error('offline');return {status:400};}),/offline/);
 assert.equal(calls,2);
});
test('user must click, no private user fields or auto-run exist on buyer guide',()=>{
 const html=read('x402-post-body-diagnostic.html');
 const ui=read('x402-directory-get-probe-ui.mjs');
 const css=read('x402-post-body-diagnostic.css');
 assert.match(html,/id="run-directory-get" type="button"/);
 assert.match(html,/id="directory-get-status" role="status"/);
 assert.match(html,/id="directory-get-result"/);
 assert.match(html,/id="directory-get-targets"/);
 assert.equal((html.match(/src="x402-directory-get-probe-ui\.mjs"/g)||[]).length,1);
 assert.match(ui,/button\.addEventListener\('click'/);
 assert.doesNotMatch(ui,/innerHTML|window\.location|sendBeacon|localStorage|sessionStorage|ethereum\.request|eth_sendTransaction/i);
 assert.doesNotMatch(html,/<form[^>]*>|<input[^>]*>/i);
 assert.match(css,/#directory-get-result dl/);
});
test('page discloses identity of original merchant, exact limits and no contract',()=>{
 const html=read('x402-post-body-diagnostic.html');
 assert.match(html,/optional actual payable service/i);
 assert.match(html,/email-dns-preflight\?domain=example\.com/);
 assert.match(html,/one existing automated directory/i);
 assert.match(html,/not an official listing correction/i);
 assert.match(html,/No payment or wallet access|never signs, settles/i);
 assert.match(html,/not mailbox access/i);
 assert.match(html,/Existing actual buyers of this DNS endpoint: not verified/i);
});
