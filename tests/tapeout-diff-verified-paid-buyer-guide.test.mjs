import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('tapeout-cpu0-diff-x402.html');
const main=read('index.html'),services=read('services.html'),oneBlock=read('tapeout-x402-data.html');
const llms=read('llms.txt'),sitemap=read('sitemap.xml');
const cat=JSON.parse(read('catalog.json'));
const diffId='xlayer-tapeout-cpu0-historical-diff-x402-base';
const item=cat.offers.filter(x=>x.id===diffId);
const original='0x4e3106520e40af30870cafe78da1b1e7110ed98e';
const canonical='https://livastic-vm1-primary.github.io/paperpilot-tools/tapeout-cpu0-diff-x402.html';
const payapi='https://payapi.market/api/tapeout-x-layer-cpu0-historical-state-diff';
const tx='0x7725c3545291b731b2075cadd1622f77ffe3342496bfba474055a4e97d1a8a7e';
const sample='https://vm5-openapi-x402.onrender.com/v1/tapeout-cpu0-diff-sample';
const paid='https://vm5-openapi-x402.onrender.com/v1/tapeout-cpu0-diff';

test('new unique item still uses one original beneficiary, old SKU not overwritten',()=>{
 assert.equal(item.length,1);
 assert.equal(item[0].originalVm1MetaMaskPayTo.toLowerCase(),original);
 assert.equal(item[0].page,payapi);
 assert.equal(item[0].endpoint,paid);
 assert.equal(item[0].buyer_guide,canonical);
 assert.equal(item[0].free_sample_url,sample);
 assert.equal(item[0].price_usdc,'0.010000');
 assert.equal(item[0].network,'eip155:8453');
 assert.equal(item[0].dataSourceNetwork,'eip155:196');
 assert.equal(item[0].fieldsCompared,20);
 assert.equal(item[0].separateFromCurrentStateSnapshot,true);
 assert.ok(cat.offers.some(x=>x.id==='btc-usdt-perpetual-funding-x402-base'));
 assert.equal(cat.offers.length,26);
});
test('every quote value and public test transaction is disclosed exactly',()=>{
 for(const fragment of [canonical,payapi,paid,tx,'eip155:8453','0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913','10000','0.010000','196','20']){
   assert.ok(html.toLowerCase().includes(fragment.toLowerCase()),fragment);
 }
 assert.ok(html.toLowerCase().includes(original));
 assert.match(html,/payment_verified: true/);
 assert.equal(item[0].verifiedBaseTxHash,tx);
 assert.equal(item[0].originalBaseWalletBalanceIncrementCoincidesUSDC,'0.010000');
});
test('one operator-paid check is not called recurring organic revenue',()=>{
 assert.equal(item[0].paidOperatorVerificationCount,1);
 assert.equal(item[0].independentOrganicBuyerCountVerified,0);
 assert.equal(item[0].repeatSalesVerified,0);
 assert.equal(item[0].underlyingOnchainEventIndependentlyDecodedByThisVM,false);
 assert.equal(item[0].verifiedTransferLogIndexByThisVM,null);
 assert.equal(item[0].netProfitAfterLaborHostingGasTax,'UNKNOWN');
 assert.match(html,/one marketplace operator validation purchase/i);
 assert.match(html,/not evidence of independent repeat customers/i);
 assert.match(html,/does not claim to have independently decoded the ERC20 event/);
});
test('free preview is explicitly fictional and not charged',()=>{
 assert.ok(html.includes(sample));
 assert.match(html,/paid:false/);
 assert.match(html,/exampleOnly:true/);
 assert.equal(item[0].freeSampleFictional,true);
 assert.match(html,/This is not an audit/);
 assert.match(html,/Snapshot differences cannot prove an event happened only once/);
});
test('read-only static public docs are linked from all intended existing pages',()=>{
 for(const s of [main,services,oneBlock,llms,sitemap]){
   assert.ok(s.includes('tapeout-cpu0-diff-x402.html'));
 }
 assert.equal(sitemap.split(canonical).length-1,1);
 assert.equal(main.split('id="paid-tapeout-historical-diff"').length-1,1);
 assert.equal(html.split('<script').length-1,0);
 assert.equal(html.split('<form').length-1,0);
 assert.match(html,/script-src 'none'/);
});
test('two SKUs keep independent honest prices and original payout route',()=>{
 assert.match(oneBlock,/0\.005 native Circle USDC/);
 assert.match(oneBlock,/0\.010000 native Base Circle USDC/);
 assert.equal(item[0].price_native_circle_usdc,'0.010000');
 assert.notEqual(item[0].endpoint,'https://vm5-openapi-x402.onrender.com/v1/tapeout-cpu0-report');
 assert.match(html,/one original MetaMask public balance increased by 0\.010000 USDC/);
 assert.equal(item[0].isSameOneHumanOwnerDifferentOperatingVM,true);
});
