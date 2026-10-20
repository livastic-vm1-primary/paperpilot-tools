import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const page=read('csv-quality-api.html');
const proof='https://nohumans.directory/l/816d6709-3d0';
test('buyer page has real independent external past payment proof plain link instead of externally loaded badge',()=>{
 assert.ok(page.includes('href="'+proof+'"'));
 assert.match(page,/paid-verified/);
 assert.match(page,/Verify prior 0.005 USDC GET delivery/);
 assert.doesNotMatch(page,/src="https:\/\/nohumans\.directory\//);
 assert.doesNotMatch(page,/\bfetch\(["']https:\/\/nohumans\.directory/);
});
test('one paid fictional GET must never imply a custom paid CSV POST or real visitor',()=>{
 const pos=page.indexOf('Independent merchant status, not an affiliate endorsement:');
 assert.ok(pos>0);
 const context=page.slice(pos,pos+1350);
 assert.match(context,/GET data is a fixed fictional report/);
 assert.match(context,/To inspect YOUR authorized CSV/);
 assert.match(context,/POST does not inherit the GET's paid-verification result/);
 assert.match(context,/never a paid human customer/);
});
test('documented API seller original price, sample and two product methods remain unchanged',()=>{
 assert.ok(page.includes('https://vm5-openapi-x402.onrender.com/v1/csv-sample'));
 assert.ok(page.includes('https://vm5-openapi-x402.onrender.com/v1/csv-preflight'));
 assert.ok(page.includes('https://vm5-openapi-x402.onrender.com/v1/csv-report'));
 assert.match(page,/0.005 USDC/);
 assert.match(page,/A valid request receiving HTTP 402 is <strong>not itself a payment/);
 assert.match(page,/No subscription, agent account or advance deposit/);
});
