import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyUnsignedResponses,probeOriginalMerchant,PUBLIC_ONLY_FIXTURE,MERCHANT_URL,
 EXPECTED_NETWORK,EXPECTED_TOKEN,EXPECTED_RECIPIENT,EXPECTED_ATOMIC} from '../x402-post-body-diagnostic-core.mjs';
const here=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,here),'utf8');
const encode=(change={})=>{
 const quote={x402Version:2,resource:{url:MERCHANT_URL},accepts:[{scheme:'exact',network:EXPECTED_NETWORK,
  asset:EXPECTED_TOKEN,amount:EXPECTED_ATOMIC,payTo:EXPECTED_RECIPIENT}]};
 if(change.accepts)quote.accepts=change.accepts;
 Object.assign(quote,Object.fromEntries(Object.entries(change).filter(([k])=>k!=='accepts')));
 return Buffer.from(JSON.stringify(quote)).toString('base64');
};
const good=()=>classifyUnsignedResponses(400,402,encode());
test('valid original public quoted challenge is *not* payment or customer sale',()=>{
 const r=good();assert.equal(r.ok,true);assert.equal(r.code,'UNSIGNED_400_402_EXPECTED');
 assert.equal(r.paid,false);assert.equal(r.settled,false);assert.equal(r.signedRequests,0);
 assert.equal(r.outsideCustomerPurchaseProven,false);assert.equal(r.quote.quotedNativeCircleBaseUSDC,'0.005000');
});
test('POST {} HTTP400 then hypothetical HTTP200 never becomes success',()=>{
 for(const status of [200,201,204,400,401,404,500,503]){
  const r=classifyUnsignedResponses(400,status,encode());
  assert.equal(r.ok,false);assert.equal(r.paid,false);
 }
});
test('HTTP400 is required for intentionally invalid fixture; not wrongly sold as failed 402',()=>{
 for(const status of [200,201,204,402,403,404,429,500]){
  const r=classifyUnsignedResponses(status,402,encode());
  assert.equal(r.ok,false);assert.equal(r.code,'INVALID_SCHEMA_NOT_400');
 }
});
test('wrong payment chain/token/price/recipient or multiple payment options fail closed',()=>{
 const orig={scheme:'exact',network:EXPECTED_NETWORK,asset:EXPECTED_TOKEN,
  amount:EXPECTED_ATOMIC,payTo:EXPECTED_RECIPIENT};
 const bad=[
  {...orig,network:'eip155:1'},{...orig,asset:'0x'+'f'.repeat(40)},
  {...orig,amount:'500000'},{...orig,payTo:'0x'+'f'.repeat(40)},
  {...orig,scheme:'upto'},{...orig,amount:5000},
 ];
 for(const option of bad){
  assert.equal(classifyUnsignedResponses(400,402,encode({accepts:[option]})).ok,false);
 }
 assert.equal(classifyUnsignedResponses(400,402,encode({accepts:[orig,orig]})).ok,false);
 assert.equal(classifyUnsignedResponses(400,402,encode({x402Version:1})).ok,false);
 assert.equal(classifyUnsignedResponses(400,402,encode({resource:{url:'https://other.example/pay'}})).ok,false);
});
test('quoted HEX addresses are case-insensitive while token identity is exact',()=>{
 const encoded=encode({accepts:[{scheme:'exact',network:EXPECTED_NETWORK,
  amount:'5000',asset:EXPECTED_TOKEN.toUpperCase(),payTo:EXPECTED_RECIPIENT.toUpperCase()}]});
 assert.equal(classifyUnsignedResponses(400,402,encoded).ok,true);
});
test('invalid JSON / oversize / malformed Base64 never raises to UI nor passes',()=>{
 for(const h of [null,'', '!secret', 'a', 'ab=',Buffer.from('{bad').toString('base64'),'a'.repeat(12100),
  Buffer.from('"some string"').toString('base64'),Buffer.from('[]').toString('base64')]){
  const r=classifyUnsignedResponses(400,402,h);
  assert.equal(r.ok,false);assert.equal(r.code,'QUOTE_FIELD_MISMATCH');
 }
});
test('probe limits to original public API and exact two *fixed* fictional samples',async()=>{
 const events=[];
 const mock=async (url,options)=>{
  events.push({url,options});
  return {status:events.length===1?400:402,headers:{get:name=>name==='payment-required'?encode():null}};
 };
 const r=await probeOriginalMerchant(mock);
 assert.equal(r.ok,true);
 assert.equal(events.length,2);
 assert.ok(events.every(v=>v.url===MERCHANT_URL));
 assert.deepEqual(events.map(v=>v.options.body),[PUBLIC_ONLY_FIXTURE.invalidSchema,PUBLIC_ONLY_FIXTURE.unpaidSample]);
 assert.ok(events.every(v=>v.options.method==='POST'&&v.options.redirect==='error'&&
  v.options.credentials==='omit'&&v.options.cache==='no-store'&&v.options.mode==='cors'&&
  v.options.referrerPolicy==='no-referrer'));
 assert.ok(events.every(v=>Object.keys(v.options.headers).join(',')==='Content-Type'));
 assert.ok(!events.some(v=>'payment-signature' in v.options.headers ||'authorization' in v.options.headers));
 assert.equal(events[0].options.body,'{}');
 assert.ok(events[1].options.body.includes('Ada'));
 assert.ok(events[1].options.body.includes('Lin'));
});
test('first failed request short-circuits; no unsafe postpayment retry',async()=>{
 let calls=0;
 await assert.rejects(()=>probeOriginalMerchant(()=>{calls++;throw Error('CORS blocked');}),/CORS blocked/);
 assert.equal(calls,1);
});
test('a real non-402 browser network error fails closed without uploading user data',async()=>{
 let calls=0;
 const mock=async()=>({status:++calls===1?400:429,headers:{get:()=>null}});
 assert.equal((await probeOriginalMerchant(mock)).ok,false);
 assert.equal(calls,2);
});
test('static HTML only opts in on explicit click; CSP restricts fetch to original merchant',()=>{
 const html=read('x402-post-body-diagnostic.html');
 const ui=read('x402-post-body-diagnostic-ui.mjs');
 const core=read('x402-post-body-diagnostic-core.mjs');
 assert.match(html,/connect-src https:\/\/vm5-openapi-x402\.onrender\.com/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/script-src 'self'/);
 assert.match(ui,/button\.addEventListener\('click'/);
 assert.doesNotMatch(ui,/innerHTML|document\.write|localStorage|sessionStorage/);
 assert.doesNotMatch(html,/<input\s+type="file"|<textarea|<form/);
 assert.doesNotMatch(core,/ethereum\.request|signTypedData|eth_sendTransaction|payment-signature.*:/i);
 assert.doesNotMatch(core,/XMLHttpRequest|localStorage|navigator\.sendBeacon/);
 assert.equal((html.match(/src="x402-post-body-diagnostic-ui\.mjs"/g)||[]).length,1);
});
test('local-only page retains connect-src none while new page has separate explicit network allowance',()=>{
 const old=read('x402-inspector.html');
 const seller=read('csv-quality-api.html');
 assert.match(old,/connect-src 'none'/);
 assert.equal((old.match(/href="x402-post-body-diagnostic\.html"/g)||[]).length,1);
 assert.equal((seller.match(/href="x402-post-body-diagnostic\.html"/g)||[]).length,1);
});
test('sitemap includes new page exactly once, contact query routes to existing x402 audit scope',()=>{
 const sitemap=read('sitemap.xml');
 const html=read('x402-post-body-diagnostic.html');
 assert.equal((sitemap.match(/x402-post-body-diagnostic\.html/g)||[]).length,1);
 assert.match(html,/contact\.html\?service=x402-audit/);
 assert.match(html,/x402-inspector\.html#buyer-feedback/);
 assert.match(html,/before payment/);
 assert.match(html,/No private payment headers/);
 assert.match(html,/one human beneficiary/);
});
