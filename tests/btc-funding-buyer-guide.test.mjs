import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const r=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const page=r('btc-funding-x402-data.html');
const index=r('index.html'),services=r('services.html');
const llms=r('llms.txt'),sitemap=r('sitemap.xml');
const cat=JSON.parse(r('catalog.json'));
const pay='https://payapi.market/api/btc-usdt-perpetual-funding-4-live-exchange-quotes';
const bought='0x0cf2906aa5cc7fc8978b81307e61d2569e0759452b41c09f2dcae8cb87721edd';
const original='0x4e3106520E40af30870caFE78da1B1e7110eD98E';
const guide='https://livastic-vm1-primary.github.io/paperpilot-tools/btc-funding-x402-data.html';

test('unique dedicated public guide is canonical and robots-indexable',()=>{
 assert.match(page,/<!doctype html>/i);
 assert.match(page,/<html lang="en">/);
 assert.match(page,/name="robots" content="index,follow"/);
 assert.ok(page.includes(guide));
 assert.match(page,/<h1>BTC\/USDT perpetual funding rates from four exchanges<\/h1>/);
 assert.match(page,/Content-Security-Policy[^>]+script-src &#39;none&#39;|Content-Security-Policy[^>]+script-src 'none'/);
 assert.doesNotMatch(page,/fetch\(|<script|onload\s*=|<form/i);
});
test('quote and payee match the original existing wallet exactly',()=>{
 const offered=cat.offers.filter(x=>x.id==='btc-usdt-perpetual-funding-x402-base');
 assert.equal(offered.length,1);
 assert.equal(offered[0].buyer_guide,guide);
 assert.equal(offered[0].endpoint,'https://vm5-openapi-x402.onrender.com/v1/btc-funding-four-venues');
 assert.equal(offered[0].page,pay);
 assert.equal(offered[0].price_native_circle_usdc,'0.010000');
 assert.equal(offered[0].originalVm1MetaMaskPayTo,original);
 for(const fragment of ['x402Version: 2','eip155:8453','10000','0.010000','0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913',original]){
   assert.ok(page.toLowerCase().includes(fragment.toLowerCase()),fragment);
 }
});
test('free preview clearly labels fictional and never claims live data',()=>{
 assert.match(page,/Free fictional JSON example/);
 assert.match(page,/exampleOnly:true/);
 assert.match(page,/noRealMarketQuoteInThisSample:true/);
 assert.ok(page.includes('https://vm5-openapi-x402.onrender.com/v1/btc-funding-sample'));
 assert.match(page,/not.*APY/i);
 assert.match(page,/not.*investment recommendation/i);
});
test('historical single operator payment is honestly differentiated from organic orders',()=>{
 assert.ok(page.includes(bought));
 assert.match(page,/one marketplace-operated verification purchase/);
 assert.match(page,/not an independently documented organic paying customer/i);
 assert.match(page,/No new money is charged or collected by browsing/i);
 assert.equal(cat.offers.find(x=>x.id==='btc-usdt-perpetual-funding-x402-base').repeatSalesVerified,0);
});
test('static marketing surfaces and sitemap link the same unique guide',()=>{
 for(const content of [index,services,llms,sitemap]){
   assert.ok(content.includes('btc-funding-x402-data.html'));
 }
 assert.equal(index.split('href="btc-funding-x402-data.html"').length-1,1);
 assert.equal(services.split('href="btc-funding-x402-data.html"').length-1,1);
 assert.equal(sitemap.split(guide).length-1,1);
});
test('no wallet data entry, signature automation, tracked visitor or self-purchase code',()=>{
 for(const item of [page,index,services,llms]){
  assert.doesNotMatch(item,/SECRET_PRIVATE_KEY|ENTER_YOUR_SEED_HERE|sell all my usdc/i);
 }
 assert.match(page,/No wallet signature, account creation or token transfer is needed to view the price/);
 assert.ok(page.includes('No services or customer contract are automatically created'));
});
