import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const base='https://vm5-openapi-x402.onrender.com/v1';
const url='https://payapi.market/api/btc-usdt-perpetual-funding-4-live-exchange-quotes';
const tx='0x0cf2906aa5cc7fc8978b81307e61d2569e0759452b41c09f2dcae8cb87721edd';
const original='0x4e3106520E40af30870caFE78da1B1e7110eD98E';
const d=JSON.parse(read('catalog.json'));
const row=d.offers.filter(x=>x.id==='btc-usdt-perpetual-funding-x402-base');

test('one original x402 paid API product is discoverable and has one platform test only',()=>{
 assert.equal(row.length,1,'one owner, one product, not repeated listings');
 assert.equal(row[0].endpoint,base+'/btc-funding-four-venues');
 assert.equal(row[0].page,url);
 assert.equal(row[0].price_usdc,'0.010000');
 assert.equal(row[0].network,'eip155:8453');
 assert.equal(row[0].protocol,'x402 v2');
 assert.equal(row[0].http_method,'GET');
 assert.equal(row[0].originalVm1MetaMaskPayTo,original);
 assert.equal(row[0].tokenAddress,'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
 assert.equal(row[0].paidOperatorVerificationCount,1);
 assert.equal(row[0].paidOperatorVerificationUSDC,'0.010000');
 assert.equal(row[0].verifiedBaseTxHash,tx);
 assert.equal(row[0].verifiedBaseTokenTransferLogIndex,90);
 assert.equal(row[0].independentOrganicBuyerCountVerified,0);
 assert.equal(row[0].repeatSalesVerified,0);
 assert.equal(row[0].netProfitAfterGasInfrastructureAndTax,'UNKNOWN');
});

test('user-facing pages show verified listing and not fake repeat buyers',()=>{
 const index=read('index.html');
 const services=read('services.html');
 const llms=read('llms.txt');
 assert.equal(index.split('id="paid-btc-funding-api"').length-1,1);
 assert.match(index,/<h2 id="paid-btc-funding-title".*?BTC\/USDT/);
 for(const page of [index,services,llms]){
  assert.ok(page.includes(url),'canonical PayAPI link');
  assert.ok(page.includes(tx),'specific public verification tx');
  assert.match(page,/one.*(test|verification|operator)|operator.*paid/i);
 }
 assert.match(index,/not evidence of organic or repeat buyers/i);
 assert.match(index,/Not an investment recommendation/i);
 assert.match(index,/Free fictional sample/i);
 assert.match(services,/No organic buyers/);
 assert.match(llms,/NOT evidence of organic repeat orders/);
});

test('all buyer destinations are HTTPS and free sample is clearly separate',()=>{
 assert.equal(row[0].free_sample_url,base+'/btc-funding-sample');
 for(const value of [row[0].page,row[0].endpoint,row[0].free_sample_url]){
  const u=new URL(value);
  assert.equal(u.protocol,'https:');
  assert.equal(u.username,'');
  assert.equal(u.password,'');
 }
 assert.equal(row[0].ownerPrivateKeysRequiredForBrowsingOrSample,false);
 assert.equal(row[0].tradingInstructionsOrYieldGuarantees,false);
 assert.equal(row[0].isSeparateVM5HostedProductBelongingToSameOneHumanOwner,true);
});
