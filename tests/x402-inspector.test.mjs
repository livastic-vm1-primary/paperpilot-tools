import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  analyze, parseInput, parseCap, TEST_FIXTURE,
  NETWORK, NATIVE_BASE_USDC, MAX_BYTES,
} = require('../x402-inspector-core.js');
const fixture = structuredClone(TEST_FIXTURE);
const encode = obj => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
const valid = () => JSON.stringify(fixture);
const html = readFileSync(new URL('../x402-inspector.html', import.meta.url), 'utf8');
const browserJS = readFileSync(new URL('../x402-inspector.js', import.meta.url), 'utf8');
const coreJS = readFileSync(new URL('../x402-inspector-core.js', import.meta.url), 'utf8');

test('free demo is a clearly fictional x402 v2 quote, not a settlement claim', () => {
  const a=analyze(valid());
  assert.equal(a.options.length, 1);
  assert.equal(a.options[0].network, NETWORK);
  assert.equal(a.options[0].nativeBaseUSDC, true);
  assert.equal(a.options[0].amountUSDC, '0.010000');
  assert.equal(a.chargedUSDC, '0');
  assert.equal(a.networkRequests, 0);
  assert.equal(a.merchantIdentityVerified, false);
  assert.equal(a.onchainSettlementVerified, false);
  assert.match(a.resource.url,/example\.invalid/);
});
test('real base64 HTTP payment-required header is parsed without a network call', () => {
  const b64 = encode(fixture);
  assert.deepEqual(parseInput('HTTP/1.1 402 Payment Required\nContent-Type: application/json\nPAYMENT-REQUIRED: '+b64), fixture);
  assert.equal(analyze('PAYMENT-REQUIRED: '+b64).options[0].amountUSDC, '0.010000');
});
test('base64url with stripped padding remains supported', () => {
  const base64url = encode(fixture).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  assert.equal(analyze(base64url).options[0].amountUSDC,'0.010000');
});
test('a bad unsigned or malformed Base64 quote returns no successful report', () => {
  for (const s of ['=', 'A', '%12+!', 'PAYMENT-REQUIRED: not-url-safe!', 'HTTP/1.1 402']) {
    assert.throws(()=>analyze(s),Error,s);
  }
});
test('fails closed for malformed JSON and wrong x402 version',()=>{
  assert.throws(()=>analyze('{test:}'),SyntaxError);
  const v = structuredClone(fixture);v.x402Version=1;
  assert.throws(()=>analyze(JSON.stringify(v)),/Only x402 version 2/);
});
test('signed PAYMENT-SIGNATURE, X-PAYMENT and Authorization headers are rejected',()=>{
  for(const key of ['PAYMENT-SIGNATURE','X-PAYMENT','Authorization']) {
    assert.throws(()=>analyze(key+': abc.def.ghi'),/signed payment or authorization/);
    assert.throws(()=>analyze('HTTP/1.1 402\nPAYMENT-REQUIRED: '+encode(fixture)+'\n'+key+': SECRET'),/signed payment or authorization/);
  }
});
test('rejects more than 32 KiB or missing acceptance entries',()=>{
  assert.throws(()=>analyze('a'.repeat(MAX_BYTES+1)),/32 KiB/);
  const x = structuredClone(fixture);x.accepts=[];
  assert.throws(()=>analyze(JSON.stringify(x)),/1–20/);
  x.accepts=new Array(21).fill(fixture.accepts[0]);
  assert.throws(()=>analyze(JSON.stringify(x)),/1–20/);
});
test('price cap is exact BigInt in 6 USDC decimals, not float rounding',()=>{
  assert.equal(parseCap('0.000001'),1n);
  assert.equal(parseCap('0.02'),20000n);
  assert.equal(analyze(valid(),'0.009999').options[0].overBudget,true);
  assert.equal(analyze(valid(),'0.010000').options[0].overBudget,false);
  assert.equal(analyze(valid(),'0.01').options[0].overBudget,false);
});
test('zero, noninteger, huge and exponential quoted atomic amounts not treated as positive USDC',()=>{
  for(const bad of ['0','-1','1.23','1e20',1,'0x10',null]) {
    const x=structuredClone(fixture);x.accepts[0].amount=bad;
    const out=analyze(JSON.stringify(x));
    assert.equal(out.options[0].amountUSDC,null);
    assert.match(out.options[0].issues.join('|'),/invalid positive integer/);
  }
});
test('malformed display budget is rejected before report, never a wallet limit',()=>{
  for(const bad of ['','NaN','Infinity','-1','0.0000001','1e3','10001','1000000']) {
    assert.throws(()=>analyze(valid(),bad),/USDC budget|Budget limit/);
  }
});
test('unknown asset on Base cannot be shown as Circle native USDC',()=>{
  const x=structuredClone(fixture);x.accepts[0].asset='0x0000000000000000000000000000000000000000';
  const c=analyze(JSON.stringify(x)).options[0];
  assert.equal(c.amountUSDC,null);
  assert.equal(c.nativeBaseUSDC,false);
  assert.match(c.issues.join(' '),/not native Circle USDC/);
});
test('wrong chain cannot get misleading USDC price even with Base token address',()=>{
  const x=structuredClone(fixture);x.accepts[0].network='eip155:1';
  const c=analyze(JSON.stringify(x)).options[0];
  assert.equal(c.nativeBaseUSDC,false);
  assert.equal(c.amountUSDC,null);
  assert.match(c.issues.join(' '),/Not Base mainnet/);
});
test('invalid payTo address never appears as validated merchant identity',()=>{
  const x=structuredClone(fixture);x.accepts[0].payTo='@NOT_A_WALLET';
  const out=analyze(JSON.stringify(x));
  assert.equal(out.options[0].recipientFormatValid,false);
  assert.equal(out.merchantIdentityVerified,false);
  assert.match(out.options[0].issues.join(' '),/20-byte EVM/);
});
test('valid-looking recipient format never means merchant controls address',()=>{
  const c=analyze(valid()).options[0];
  assert.equal(c.recipientFormatValid,true);
  assert.match(c.issues.join(' '),/no merchant identity/);
});
test('more than one quote option is explicitly disclosed and inspected',()=>{
  const x=structuredClone(fixture);
  x.accepts.push({...x.accepts[0],network:'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'});
  const out=analyze(JSON.stringify(x));
  assert.equal(out.options.length,2);
  assert.match(out.notices.join(' '),/Multiple/);
  assert.match(out.options[1].issues.join(' '),/Not Base mainnet/);
});
test('non-HTTPS resource quotes trigger caution without fetching',()=>{
  const x=structuredClone(fixture);x.resource.url='http://example.invalid/';
  const out=analyze(JSON.stringify(x));
  assert.match(out.notices.join(' '),/not HTTPS/);
  assert.equal(out.networkRequests,0);
});
test('object fields cannot override source code or trigger a network request',()=>{
  const x=structuredClone(fixture);
  x.resource.description='<img src=x onerror=alert(1)>';
  x.accepts[0].payTo='<script>alert(1)</script>';
  const out=analyze(JSON.stringify(x));
  assert.equal(out.merchantIdentityVerified,false);
  assert.equal(out.options[0].recipientFormatValid,false);
  assert.doesNotMatch(coreJS,/\bfetch\s*\(|\bXMLHttpRequest\s*\(|\bethers\.|window\.ethereum|WebSocket\s*\(/);
  assert.doesNotMatch(browserJS,/innerHTML|localStorage|sessionStorage|sendBeacon|fetch\s*\(/);
  assert.match(browserJS,/\.textContent\s*=/);
});
test('website security and user-visible checkout separation are accurate',()=>{
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/script-src 'self'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/x402-inspector-core\.js/);
  assert.match(html,/wallet signature/i);
  assert.match(html,/merchant identity/i);
  assert.match(html,/0\.010000/);
  assert.match(html,/eip155:8453/);
  assert.match(html,/https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/x402-sample/);
  assert.match(html,/No paid customer of this particular endpoint/);
});
