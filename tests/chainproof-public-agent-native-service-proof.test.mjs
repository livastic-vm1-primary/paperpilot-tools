import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const services=readFileSync(new URL('../services.html',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const repo='https://github.com/livastic-vm1-primary/chainproof-agent-native-20261024';
test('one legitimate tested original free ChainProof repository link',()=>{
 assert.equal(services.split('href="'+repo+'"').length-1,1);
 assert.ok(services.includes('10 automated evidence-screening tests'));
});
test('clear financial and data-safety limitations',()=>{
 assert.ok(services.includes('six demo rows are entirely fictional'));
 assert.ok(services.includes('has no verified paid customer or revenue'));
 assert.ok(services.includes('without a wallet signature or chain RPC'));
});
test('existing consent-based manual quote path reused',()=>{
 assert.ok(services.includes('href="contact.html?service=qa">request a private, no-obligation written-scope quote'));
});
test('no fabricated new paid product registered',()=>{
 assert.equal(catalog.offers.filter(x=>JSON.stringify(x).includes('chainproof-agent-native-20261024')).length,0);
});
