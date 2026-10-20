import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {reviewOptions,parseOptionsHeaders,MAX_RESPONSE_BYTES} from '../tools/x402-browser-cors-preflight.mjs';
const origin='https://livastic-vm1-primary.github.io';
const good=[
 'HTTP/1.1 204 No Content',
 'Access-Control-Allow-Origin: *',
 'Access-Control-Allow-Methods: GET,POST,OPTIONS',
 'Access-Control-Allow-Headers: Content-Type,PAYMENT-SIGNATURE,PAYMENT-RESPONSE',
 'Access-Control-Expose-Headers: PAYMENT-REQUIRED,PAYMENT-RESPONSE',
 '', '',
].join('\r\n');
const check=(s=good,args={})=>reviewOptions(s,{origin,...args});
test('correct original VM5 CORS preflight on buyer POST looks compatible, but cannot claim a sale',()=>{
 const r=check();
 assert.equal(r.preflightAppearsCompatible,true);
 assert.deepEqual(r.missingHeaderNames,[]);
 assert.equal(r.optionsHttpStatus,204);
 assert.equal(r.chargedUSDC,'0');
 assert.equal(r.networkRequests,0);
 assert.equal(r.outsideCustomerPaymentConfirmed,false);
 assert.match(r.caveat,/not prove browser signing/);
});
test('the SDK extra REQUEST Access-Control-Expose-Headers blocks this seller',()=>{
 const r=check(good,{requestHeaders:['content-type','payment-signature','access-control-expose-headers']});
 assert.equal(r.preflightAppearsCompatible,false);
 assert.deepEqual(r.missingHeaderNames,['access-control-expose-headers']);
 assert.match(r.warnings.join(' '),/omits at least one/);
});
test('case-insensitive CORS metadata names and header lists work',()=>{
 const v=good.replace('Access-Control-Allow-Headers','access-control-allow-headers')
 .replace('Content-Type,PAYMENT-SIGNATURE,PAYMENT-RESPONSE','content-type,Payment-Signature,payment-response');
 assert.equal(check(v).preflightAppearsCompatible,true);
});
test('preflight that returns 402 fails closed even if headers otherwise look fine',()=>{
 const r=check(good.replace('204 No Content','402 Payment Required'));
 assert.equal(r.preflightAppearsCompatible,false);
 assert.match(r.warnings.join(' '),/HTTP OPTIONS was not 2xx/);
});
test('unexpected origin cannot use permissive endpoint claims',()=>{
 const r=check(good.replace('Allow-Origin: *','Allow-Origin: https://other.example'));
 assert.equal(r.preflightAppearsCompatible,false);
 assert.match(r.warnings.join(' '),/does not match/);
});
test('missing POST method makes apparent 204 unsuitable',()=>{
 const r=check(good.replace('Allow-Methods: GET,POST,OPTIONS','Allow-Methods: GET'));
 assert.equal(r.preflightAppearsCompatible,false);
 assert.match(r.warnings.join(' '),/intended method/);
});
test('header-size bound rejects pathological raw server output',()=>{
 assert.throws(()=>parseOptionsHeaders(good+'x'.repeat(MAX_RESPONSE_BYTES)),/16 KiB/);
});
test('signed or credentialed HTTP header paste is rejected, never logged',()=>{
 for(const name of ['PAYMENT-SIGNATURE','Authorization','Cookie','Set-Cookie','X-PAYMENT']){
  assert.throws(()=>parseOptionsHeaders(good+name+': not-actual-private-data\n'),/Do not paste credentials/);
 }
});
test('realistic HTTP/2 OPTIONS line and a proxy CONNECT prelude work',()=>{
 const raw='HTTP/1.1 200 Connection established\r\n\r\n'+good.replace('HTTP/1.1 204 No Content','HTTP/2 204');
 const d=parseOptionsHeaders(raw);
 assert.equal(d.status,204);
 assert.equal(check(raw).preflightAppearsCompatible,true);
});
test('duplicate allow-origin headers are treated as invalid, not silently trusted',()=>{
 assert.throws(()=>check(good.replace('Access-Control-Allow-Origin: *','Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Origin: https://attacker.example')),/Duplicate CORS response header/);
});
test('arbitrary unknown or malformed status cannot be interpreted as 204',()=>{
 assert.throws(()=>check('garbage-only'),/HTTP OPTIONS status/);
 assert.throws(()=>check('{}'),/HTTP OPTIONS status/);
 assert.throws(()=>check(good.replace('HTTP/1.1 204','HTTP/1.1 HAX')),/HTTP OPTIONS status/);
});
test('correct Origin URL must be HTTPS or localhost with no path or identity',()=>{
 for(const value of ['http://attacker.example','https://buyer.example/subpath','https://user:pass@buyer.example','not-an-origin','https://buyer.example?q=1']){
  assert.throws(()=>check(good,{origin:value}),/Origin/);
 }
 assert.equal(check(good,{origin:'http://localhost:5173'}).preflightAppearsCompatible,true);
});
test('GET CORS requirements are analyzed independently',()=>{
 const goodGet=good.replace('Access-Control-Allow-Methods: GET,POST,OPTIONS','Access-Control-Allow-Methods: GET,OPTIONS');
 const a=check(goodGet,{method:'GET',requestHeaders:['payment-signature']});
 assert.equal(a.preflightAppearsCompatible,true);
 const b=check(goodGet,{method:'POST'});
 assert.equal(b.preflightAppearsCompatible,false);
});
test('non-credential wildcard warnings are not mistaken for wallet charges',()=>{
 const s=good.replace('Allow-Headers: Content-Type,PAYMENT-SIGNATURE,PAYMENT-RESPONSE','Allow-Headers: *');
 const r=check(s);
 assert.equal(r.preflightAppearsCompatible,true);
 assert.match(r.warnings.join(' '),/Wildcard/);
 assert.equal(r.walletInteracted,false);
});
test('exposure on OPTIONS alone is not proof 402 response exposes price',()=>{
 const s=good.replace('Access-Control-Expose-Headers: PAYMENT-REQUIRED,PAYMENT-RESPONSE','Access-Control-Expose-Headers: X-SOMETHING');
 const r=check(s);
 assert.equal(r.preflightAppearsCompatible,true);
 assert.match(r.warnings.join(' '),/actual unsigned 402 response separately/);
});
test('CLI stdin fixture returns zero for compatible, 2 for mismatched CORS',()=>{
 const run=(value,extra=[])=>spawnSync(process.execPath,['tools/x402-browser-cors-preflight.mjs','--origin',origin,'--headers','content-type,payment-signature',...extra],{input:value,encoding:'utf8',timeout:5000});
 const a=run(good);
 assert.equal(a.status,0,a.stderr);
 assert.equal(JSON.parse(a.stdout).preflightAppearsCompatible,true);
 assert.equal(a.stderr,'');
 const b=run(good.replace('Allow-Headers: Content-Type,PAYMENT-SIGNATURE,PAYMENT-RESPONSE','Allow-Headers: Content-Type'));
 assert.equal(b.status,2);
 assert.deepEqual(JSON.parse(b.stdout).missingHeaderNames,['payment-signature']);
});
test('checkout source uses one narrow manual SDK payload, not auto-retry request helper',()=>{
 const root=new URL('../',import.meta.url);
 const s=readFileSync(new URL('src/csv-wallet-checkout-entry.mjs',root),'utf8');
 assert.doesNotMatch(s,/wrapFetchWithPayment\s*\(/);
 assert.match(s,/http\.encodePaymentSignatureHeader\(signaturePayload\)/);
 assert.match(s,/headerNames\.length!==1\|\|headerNames\[0\]!=="payment-signature"/);
 assert.match(s,/method:"POST"/);
 assert.match(s,/paymentAttempted=true/);
 assert.match(s,/No wrapFetchWithPayment/);
});
