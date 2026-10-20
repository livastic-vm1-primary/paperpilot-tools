import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 inspectUnpaidCsvCheckout,FIXED_FICTIONAL_CSV,ORIGINAL_SITE_ORIGIN,
} from '../examples/verify-csv-x402-unpaid.mjs';
import {CSV_API,USDC,RECIPIENT,NETWORK} from '../src/csv-x402-guard.mjs';

function exactQuote() {
 return {
  x402Version:2,
  resource:{url:CSV_API,mimeType:'application/json',description:'Synthetic CSV input'},
  accepts:[{
   scheme:'exact',network:NETWORK,
   amount:'5000',asset:USDC,payTo:RECIPIENT,maxTimeoutSeconds:300,
   extra:{name:'USD Coin',version:'2'}
  }]
 };
}
function corsPreflight(overrides={}) {
 return new Response(null,{status:204,headers:{
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type,PAYMENT-SIGNATURE,PAYMENT-RESPONSE',
  ...overrides
 }});
}
function quote402(quote=exactQuote(),overrides={}) {
 const encoded=Buffer.from(JSON.stringify(quote),'utf8').toString('base64');
 return new Response('{}',{status:402,headers:{
  'access-control-allow-origin':'*',
  'access-control-expose-headers':'PAYMENT-REQUIRED,PAYMENT-RESPONSE',
  'payment-required':encoded,
  'content-type':'application/json',
  ...overrides
 }});
}
function stub({options=corsPreflight(),post=quote402()}={}) {
 const calls=[];
 const fake=async (url,init)=>{
  calls.push({url,init});
  if(calls.length===1)return options;
  if(calls.length===2)return post;
  throw Error('No third request permitted');
 };
 return {fake,calls};
}
test('one offline mocked OPTIONS + ONE synthetic unsigned POST confirms exact quote',async()=>{
 const {fake,calls}=stub();
 const result=await inspectUnpaidCsvCheckout(fake,new Date('2026-10-21T00:00:00Z'));
 assert.equal(result.checkedUTC,'2026-10-21T00:00:00.000Z');
 assert.equal(result.quotedNativeCircleBaseUSDC,'0.005');
 assert.equal(result.unsignedPostHttpStatus,402);
 assert.equal(result.corsPreflightHttpStatus,204);
 assert.equal(result.quoteRecipient,RECIPIENT);
 assert.equal(result.independentOnchainSettlementVerified,false);
 assert.equal(result.userWalletFundsMoved,false);
 assert.equal(result.actualNewReceivedUSDC,'0');
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(x=>x.init.method),['OPTIONS','POST']);
 assert.deepEqual(calls.map(x=>x.url),[CSV_API,CSV_API]);
 assert.equal(calls[0].init.headers.Origin,ORIGINAL_SITE_ORIGIN);
 assert.deepEqual(JSON.parse(calls[1].init.body),{csvText:FIXED_FICTIONAL_CSV});
 assert.equal(calls[1].init.credentials,'omit');
 assert.equal(calls[1].init.redirect,'error');
 assert.ok(!Object.keys(calls[1].init.headers).some(x=>/signature|authorization|cookie|payment/i.test(x)));
});
test('missing or invalid explicit fetcher never opens a network request',async()=>{
 await assert.rejects(inspectUnpaidCsvCheckout(undefined),/Explicit fetcher/);
 await assert.rejects(inspectUnpaidCsvCheckout(()=>{},'bad-date'),/Bounded observation time/);
});
test('invalid preflight, wrong origin, or missing required headers blocks even the unsigned POST',async()=>{
 for(const options of [
   new Response(null,{status:403}),
   corsPreflight({'access-control-allow-origin':'https://attacker.invalid'}),
   corsPreflight({'access-control-allow-methods':'GET,OPTIONS'}),
   corsPreflight({'access-control-allow-headers':'PAYMENT-SIGNATURE'})
 ]) {
  const {fake,calls}=stub({options});
  await assert.rejects(inspectUnpaidCsvCheckout(fake));
  assert.equal(calls.length,1);
 }
});
test('HTTP200 without x402 receipt challenge does NOT prove free/paid report',async()=>{
 const {fake}=stub({post:new Response('{}',{status:200})});
 await assert.rejects(inspectUnpaidCsvCheckout(fake),/unpaid x402 HTTP 402/);
});
test('HTTP400 means malformed JSON, not a paid customer and not payable',async()=>{
 const {fake}=stub({post:new Response('{"error":"bad CSV"}',{status:400})});
 await assert.rejects(inspectUnpaidCsvCheckout(fake),/unpaid x402 HTTP 402/);
});
test('cross-origin 402 cannot be presented to browsers without header exposure',async()=>{
 const {fake}=stub({post:quote402(exactQuote(),{'access-control-expose-headers':'Content-Type'})});
 await assert.rejects(inspectUnpaidCsvCheckout(fake),/PAYMENT-REQUIRED header/);
});
test('multiple accepted schemes cannot silently choose a different recipient',async()=>{
 const q=exactQuote();q.accepts.push({...q.accepts[0]});
 const {fake}=stub({post:quote402(q)});
 await assert.rejects(inspectUnpaidCsvCheckout(fake),/number of payment options/);
});
for(const [label,modification] of [
 ['wrong amount',q=>q.accepts[0].amount='6000'],
 ['wrong network',q=>q.accepts[0].network='eip155:1'],
 ['wrong chain token',q=>q.accepts[0].asset='0x'+'f'.repeat(40)],
 ['wrong recipient',q=>q.accepts[0].payTo='0x'+'a'.repeat(40)],
 ['wrong resource URL',q=>q.resource.url='https://attacker.invalid/v1/collect'],
 ['wrong x402 version',q=>q.x402Version=1],
 ['unsupported scheme',q=>q.accepts[0].scheme='upto'],
 ['missing token data',q=>q.accepts[0].extra.name='Unexpected Coin'],
 ['overlong timeout',q=>q.accepts[0].maxTimeoutSeconds=100000]
]) {
 test('fail closed on '+label,async()=>{
  const q=exactQuote();modification(q);
  const {fake}=stub({post:quote402(q)});
  await assert.rejects(inspectUnpaidCsvCheckout(fake),undefined,label);
 });
}
test('blank/chopped 402 header cannot accidentally pass as a quote',async()=>{
 const {fake}=stub({post:quote402(exactQuote(),{'payment-required':'broken'})});
 await assert.rejects(inspectUnpaidCsvCheckout(fake),/invalid x402 payment requirement header/);
});
test('printed probe source contains no MetaMask, x402 signer, private key or payment dispatch',()=>{
 const src=readFileSync(new URL('../examples/verify-csv-x402-unpaid.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/wallet\.|window\.ethereum|privateKeyToAccount|signTypedData|sendTransaction|payment-signature['"]\s*:/i);
 assert.match(src,/Exact same public buyer-checkout security guard|EXACT same public buyer-checkout security guard/);
 assert.match(src,/FIXED_FICTIONAL_CSV/);
 assert.match(src,/--live-unsigned-check/);
});
test('inert CSV probe cannot accept a caller-provided private CSV, x402 gas or checkout signature',async()=>{
 const {fake,calls}=stub();
 await inspectUnpaidCsvCheckout(fake);
 assert.equal(calls[1].init.body.includes('customer_name'),false);
 assert.equal(calls[1].init.body.includes('password'),false);
 assert.equal(calls[1].init.body.includes('api_key'),false);
 assert.ok(!('payment-signature' in calls[1].init.headers));
 assert.ok(!('Authorization' in calls[1].init.headers));
});
