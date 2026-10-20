import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const link='contact.html?service=tradeid-review';
test('real internal path from local checker and services card to separate consent-based email inquiry',()=>{
  const a=read('tradeid-audit.html'),s=read('services.html'),c=read('contact.html'),handler=read('contact.js');
  assert.match(a,/Request 15-USDC review scope \(free inquiry, no payment\)/);
  assert.ok(a.includes(link));
  assert.match(s,/id="tradeid-review"/);
  assert.ok(s.includes(link));
  assert.match(c,/value="Crypto Trade-ID CSV 50-row manual review \(15 Base USDC\)"/);
  assert.match(handler,/'tradeid-review': 'Crypto Trade-ID CSV 50-row manual review \(15 Base USDC\)'/);
  assert.match(c,/action="https:\/\/formsubmit.co\/onecursor1@gmail.com"/);
  assert.match(c,/name="third_party_form_consent"[^>]*required/);
  assert.match(c,/name="email"[^>]*required/);
  assert.match(c,/name="_honey"/);
  assert.doesNotMatch(handler,/fetch\s*\(|\.submit\s*\(|window\.ethereum|localStorage|document\.cookie/);
});
test('honest public third-party FIXED seller-listing UI ambiguity and zero customers are prominent',()=>{
  const a=read('tradeid-audit.html'),s=read('services.html');
  assert.match(a,/Bounty \/ Open for claims/);
  assert.match(a,/NOT a working checkout/);
  assert.match(s,/not a verified checkout/);
  assert.match(a,/zero confirmed customers/);
  assert.match(s,/0 confirmed/);
  assert.match(a,/No buyer should send funds merely because it is listed/);
});
test('machine-readable offer points to actual quote form without assuming a payment gateway',()=>{
  const j=JSON.parse(read('catalog.json'));
  const o=j.offers.find(x=>x.id==='tradeid-15-usdc-clawlancer-manual-review');
  assert.equal(o.price_usdc,'15.000000');
  assert.equal(o.direct_human_checkout_public_screen_verified,false);
  assert.equal(o.free_inquiry_no_payment_or_wallet,true);
  assert.equal(o.human_paid_client_count_confirmed,0);
  assert.equal(o.inquiry,'https://livastic-vm1-primary.github.io/paperpilot-tools/'+link);
  assert.match(read('llms.txt'),/Verified free opt-in Trade-ID review quote inquiry/);
});
