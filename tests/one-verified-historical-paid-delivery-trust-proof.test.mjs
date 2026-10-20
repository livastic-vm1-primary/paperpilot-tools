import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=readFileSync(root+'services.html','utf8');
const css=readFileSync(root+'services.css','utf8');
const block=html.slice(html.indexOf('<aside class="paid-proof"'),html.indexOf('</aside>',html.indexOf('<aside class="paid-proof"'))+8);
test('one historical 1USDC paid delivery cited to original public sponsor request and tx hash',()=>{
 assert.ok(block.startsWith('<aside class="paid-proof"'));
 assert.match(block,/October 17, 2026/);
 assert.match(block,/1\.000000 native Circle USDC on Base/);
 assert.match(block,/709-word multi-agent spend plan/);
 assert.match(block,/hashn\.com\/store\/83180326-3e55-4a26-b608-87fb66677d9d\/listings\/team-spend-100-usdc\.md/);
 assert.match(block,/basescan\.org\/tx\/0x7a725fd11fde436c2e17f0918836e16b957a86d8427cacbceabc10a763985f58/);
 assert.match(css,/\.paid-proof/);
});
test('trust proof fully discloses private deal visibility limitation and no current related buyers',()=>{
 assert.match(block,/private workspace/);
 assert.match(block,/not independently visible/);
 assert.match(block,/unrelated research brief/);
 assert.match(block,/zero independently confirmed paying buyers/);
 assert.match(block,/gross, not verified after-expense profit/);
 assert.match(block,/first round was full on October 19/);
 assert.match(block,/no additional work is awarded or paid/);
});
test('new trust evidence cannot be passed off as a paid DeFi or x402 API sale',()=>{
 assert.match(block,/not for PaperPilot's DeFi CSV tool/);
 assert.match(block,/buyer-owned paid x402 CSV POST/);
 assert.match(block,/custom browser QA/);
 assert.match(block,/zero independently confirmed paying buyers/);
});
test('public trust proof contains no private HashN ids, bearer keys, user seed, direct emails',()=>{
 for(const marker of ['bef12a38-d724-438f-a826-e88e7b6d439b','1a46ddf7-f105-4859-8a4e-856bf11c8b0a','hashn-vm1.json','accounts/','seed phrase','credentials.json','@gmail.com']){
  assert.equal(block.includes(marker),false,marker);
 }
});
