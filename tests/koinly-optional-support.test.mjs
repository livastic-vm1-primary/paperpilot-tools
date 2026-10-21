import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECEIVER, NETWORK, CIRCLE_USDC, copyPublicReceiver, IS_PAYMENT, IS_SERVICE_ORDER } from '../koinly-optional-support.mjs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('koinly-import-triage.html');
const ui=read('koinly-optional-support-ui.mjs');
const core=read('koinly-optional-support.mjs');
const style=read('koinly-import-triage.css');
test('same owner original VM5 public 402 receiving address, correct Base token/network',()=>{
 assert.equal(RECEIVER,'0x6b01efA0705E91a7aca54271510bf9e594717f34');
 assert.equal(NETWORK,'eip155:8453');
 assert.equal(CIRCLE_USDC.toLowerCase(),'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
 assert.match(html, new RegExp(RECEIVER,'i'));
 assert.match(html,/eip155:8453/);
 assert.match(html,/0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913/);
});
test('copy is only an explicit button click, never an onchain payment',async()=>{
 let calls=0;let value='';
 const result=await copyPublicReceiver({writeText:async str=>{calls++;value=str;}});
 assert.equal(result.copied,true);assert.equal(calls,1);assert.equal(value,RECEIVER);
 assert.equal(IS_PAYMENT,false);
 assert.equal(IS_SERVICE_ORDER,false);
 assert.match(ui,/button\.addEventListener\("click"/);
 assert.doesNotMatch(ui, /(?:ethereum\.request|window\.ethereum|eth_sendTransaction|eth_sign|eth_sendRawTransaction|signMessage|ethers|web3|fetch\()/);
});
test('clipboard failure is non-destructive, no fallback spend and readable address remains on page',async()=>{
 const n=await copyPublicReceiver(undefined);
 assert.equal(n.copied,false);assert.match(n.reason,/manually/i);
 const x=await copyPublicReceiver({writeText:()=>Promise.reject(Error('denied'))});
 assert.equal(x.copied,false);assert.match(x.reason,/manually/i);
 assert.match(html,/user-select|voluntary-receiver-address/);
});
test('genuine free-first service remains free and independent of voluntary support',()=>{
 assert.match(html,/all four checklists and the local column mapper stay free/);
 assert.match(html,/completely free/);
 assert.match(html,/strictly <strong>voluntary tip<\/strong>/);
 assert.match(html,/zero/);
 assert.match(html,/no priority access/);
 assert.match(html,/not a charitable\/tax-deductible donation/);
 assert.match(html,/no automatic checkout/);
 assert.match(html,/a tip is NEVER an order/i);
 assert.match(html,/separate 5 Base USDC service/);
 assert.match(html,/before any separately contracted paid work/);
 assert.match(html,/No verified voluntary support receipts/);
});
test('privacy and owner-custody caveat, security header unchanged, no APIs and no storage',()=>{
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/script-src 'self'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/cannot prove the operator currently controls or has recovered the signing key/);
 assert.match(html,/0x6b01efA0705E91a7aca54271510bf9e594717f34/);
 assert.match(html,/same-owner public merchant/);
 assert.match(html,/Your wallet may need gas/);
 assert.match(html,/Wrong network|wrong network/);
 for (const s of [ui,core,html]) {
  assert.doesNotMatch(s, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|ethereum\.request|eth_sendTransaction|PAYMENT-SIGNATURE:|localStorage|sessionStorage|sendBeacon/);
 }
 assert.match(style,/voluntary-support/);
});
test('static page address must exactly match imported receiver or copy disabled',()=>{
 assert.match(ui,/address\.textContent\.trim\(\) === RECEIVER/);
 assert.match(ui,/button\.disabled = true/);
 assert.match(ui,/Receiver details are inconsistent/);
 assert.equal((html.match(/src="koinly-optional-support-ui\.mjs"/g)||[]).length,1);
});
