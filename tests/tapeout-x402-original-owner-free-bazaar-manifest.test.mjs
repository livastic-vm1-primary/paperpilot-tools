import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../.well-known/x402.json',import.meta.url),'utf8'));
const html=readFileSync(new URL('../tapeout-x402-data.html',import.meta.url),'utf8');
const services=readFileSync(new URL('../services.html',import.meta.url),'utf8');
const llms=readFileSync(new URL('../llms.txt',import.meta.url),'utf8');
const sitemap=readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
const payTo='0x4e3106520E40af30870caFE78da1B1e7110eD98E';
const circle='0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913';
const endpoint='https://vm5-openapi-x402.onrender.com/v1/tapeout-cpu0-report';

test('new free seller manifest contains exactly original owner one paid original x402 route',()=>{
 assert.equal(manifest.x402Version,2);
 assert.equal(manifest.resources.length,1);
 const item=manifest.resources[0];
 assert.equal(item.url,endpoint);
 assert.equal(item.method,'GET');
 assert.equal(item.accepts.length,1);
 assert.deepEqual({scheme:item.accepts[0].scheme,network:item.accepts[0].network,asset:item.accepts[0].asset,
   amount:item.accepts[0].amount,payTo:item.accepts[0].payTo},{scheme:'exact',network:'eip155:8453',asset:circle,
   amount:'5000',payTo});
 assert.match(item.description,/read-only/i);
 assert.match(item.description,/no|not a security audit/i);
});
test('static page makes no wallet or network request, shows paid URL and free preview clearly',()=>{
 assert.match(html,/default-src 'none'/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/script-src 'none'/);
 assert.match(html,/form-action 'none'/);
 for (const w of [endpoint,'https://vm5-openapi-x402.onrender.com/v1/tapeout-cpu0-sample',circle,payTo,
  'eip155:8453','5000','0.005 USDC','PayAPI'])assert.ok(html.includes(w),'Missing verifiable public buyer field '+w);
 for(const prohibited of [/<script\b/i,/<form\b/i,/\bfetch\s*\(/i,/\bwindow\.ethereum\b/i,
 /\blocalStorage\b/i,/\bsecret_key\s*=/i,/\bnavigator\.clipboard\b/i])
  assert.doesNotMatch(html,prohibited);
 assert.match(html,/one historic|one historical/i);
 assert.match(html,/not a smart-contract audit/i);
});
test('original site has discoverable one-page merchant buyer path without misleading customers',()=>{
 assert.equal(services.split('href="tapeout-x402-data.html"').length-1,1);
 const uri='https://livastic-vm1-primary.github.io/paperpilot-tools/tapeout-x402-data.html';
 assert.equal(llms.split(uri).length-1,1);
 assert.equal(sitemap.split('<loc>'+uri+'</loc>').length-1,1);
 assert.match(services,/one historic operator paid call/);
});
test('buyer manifest excludes legacy VM5 no-signer wallet and any fake success ledger',()=>{
 const serialized=JSON.stringify(manifest);
 assert.doesNotMatch(serialized,/0x6b01efA0705E91a7aca54271510bf9e594717f34/i);
 assert.doesNotMatch(serialized,/private.?key|seed|recovery.?phrase|secret\s*=/i);
 assert.doesNotMatch(serialized,/guaranteed profit|live organic customers|unlimited purchases/i);
 assert.equal((html.match(/href="\.well-known\/x402\.json"/g)||[]).length,1);
});
