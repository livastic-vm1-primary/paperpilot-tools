import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('paid-engineering-proof.html');
const services=read('services.html');
const sitemap=read('sitemap.xml');
const llms=read('llms.txt');
const hash='9D8609A7133DB7C03235ED072D2995465FE6296D48528F22680AC5B12AF147CE';
const realPr='https://github.com/pursekeeper/api/pull/94';
const approval=realPr+'#issuecomment-6299301932';
test('single independent sponsor proof page has actual original merged PR, maintainer comment and unique Nano send',()=>{
 assert.ok(page.includes(realPr));
 assert.ok(page.includes(approval));
 assert.ok(page.includes('https://pursekeeper.dev/log'));
 assert.ok(page.includes(hash));
 assert.equal((page.match(new RegExp(hash,'g'))||[]).length,1);
});
test('accurate original Node24 maintainer review counts, not invented buyer ratings',()=>{
 assert.match(page,/187 tests total, 182 passed, 0 failed, 5 environment skips/);
 assert.match(page,/deterministic failure on the unmodified parent/);
 assert.match(page,/independently maintained open-source x402 Nano payment client/);
 assert.doesNotMatch(page,/5 stars|testimonial from|full security certification|100% secure/);
});
test('source distinguishes mainnet confirmed Nano sender block from zero spendable wallet balance',()=>{
 assert.match(page,/5 XNO receivable, 0 available/);
 assert.match(page,/recipient.*pending\/receivable|5 XNO pending\/receivable/);
 assert.match(page,/5 XNO.*?0 XNO available/s);
 assert.match(page,/separate signed receive block/);
 assert.match(page,/We did not sign a Nano receive/);
 assert.match(page,/not.*booked as a second reward/);
});
test('accurate monetary context neither double-counts historical USDC nor promises new customers',()=>{
 assert.match(page,/four historical Base USDC transfers grossing 1\.020000 USDC/);
 assert.match(page,/does <strong>not<\/strong> show that we already sold the Base USDC pilot/);
 assert.match(page,/not.*an independent outside paid CSV customer/);
 assert.doesNotMatch(page,/>Paid 5 USDC</);
 assert.doesNotMatch(page,/customer conversion rate: 100%/);
});
test('non-destructive x402 pilot links existing 49-USDC optional scope rather than a new checkout',()=>{
 assert.match(page,/49 native Base USDC x402 quote \/ browser CORS pilot/);
 assert.ok(page.includes('services.html#x402-audit'));
 assert.ok(page.includes('contact.html?service=x402-audit'));
 assert.ok(page.includes('x402-inspector.html'));
 assert.match(page,/free inquiry/);
 assert.doesNotMatch(page,/payment-signature|window\.ethereum|eth_sendTransaction|<script\b/i);
});
test('services source links publicly checkable new technical delivery without overstating client receipts',()=>{
 assert.ok(services.includes('id="pursekeeper-paid-repair"'));
 assert.ok(services.includes('paid-engineering-proof.html'));
 assert.ok(services.includes(approval));
 assert.ok(services.includes('5 XNO receivable and 0 XNO available'));
 assert.ok(services.includes('not</strong> proof of existing paid Base-USDC CSV API buyers'));
});
test('site discovery includes one canonical public asset in sitemap and clear agent guide',()=>{
 assert.equal((sitemap.match(/paid-engineering-proof\.html/g)||[]).length,1);
 assert.ok(page.includes('rel="canonical" href="https://livastic-vm1-primary.github.io/paperpilot-tools/paid-engineering-proof.html"'));
 assert.ok(llms.includes('paid-engineering-proof.html'));
 assert.ok(llms.includes('paid Base USDC API buyer'));
});
test('no secret, wallet signature, customer financial file or fake endorsement embedded',()=>{
 const src=page+services;
 assert.doesNotMatch(src,/-----BEGIN PRIVATE KEY-----|mnemonic phrase:|seed phrase: [a-z]{10}/i);
 assert.doesNotMatch(page,/<input|<textarea|<form|<script/);
 assert.ok(page.includes('does not assert a Pursekeeper endorsement'));
 assert.ok(page.includes('No buyer financial data, private keys, live signatures'));
});
test('standalone page is keyboard-accessible and mobile responsive without tracking',()=>{
 assert.match(page,/class="skip" href="#main"/);
 assert.match(page,/aria-label="Source and paid scopes"/);
 assert.match(page,/@media\(max-width:700px\)/);
 assert.doesNotMatch(page,/googletagmanager|google-analytics|hotjar|pixel|mixpanel|fbq\(/i);
});
