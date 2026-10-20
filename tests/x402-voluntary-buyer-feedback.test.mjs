import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../x402-inspector.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../x402-inspector.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../x402-inspector-core.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../x402-inspector.css',import.meta.url),'utf8');
const c=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const start=html.indexOf('<form class="feedback-form" id="x402-voluntary-buyer-feedback"');
const end=html.indexOf('</form>',start);
const form=start>-1&&end>start ? html.slice(start,end+7) : '';
test('unique voluntary feedback form uses the original owner FormSubmit destination',()=>{
 assert.ok(form,'form should exist');
 assert.equal(html.split('id="x402-voluntary-buyer-feedback"').length-1,1);
 assert.ok(form.includes('action="https://formsubmit.co/onecursor1@gmail.com"'));
 assert.ok(form.includes('method="POST"'));
 assert.ok(form.includes('id="fb-consent"'));
 assert.ok(form.includes('name="_honey"'));
 assert.ok(form.includes('not independently verified paid demand'));
});
test('fields allow actual buyer issue, client, and willingness; no raw quote or private payload',()=>{
 for(const name of ['x402_client_stack','x402_buyer_problem','nonbinding_payment_interest','needed_acceptance_evidence','email','third_party_form_consent'])
  assert.ok(form.includes('name="'+name+'"'),name);
 assert.match(form,/name="email"[^>]*maxlength="180"/);
 assert.match(form,/name="needed_acceptance_evidence"[^>]*maxlength="280"/);
 for(const name of ['quote','payment-required','payTo','private_key','raw_header','report','payment_signature']){
  assert.ok(!form.includes('name="'+name+'"'),'prohibited field '+name);
 }
 assert.doesNotMatch(form,/type="file"/);
});
test('nonbinding purchase intent is not a checkout and seller disclosure remains accurate',()=>{
 for(const x of ['Maybe 9 USDC','Maybe 49 USDC','Free tools only','e072b639-4235-428f-89ad-966c0682dbf9'])
  assert.ok(form.includes(x),x);
 assert.match(html,/not a sale, order, wallet connection, payment/);
 assert.doesNotMatch(form,/window\.ethereum|sendTransaction|signTypedData|connectWallet/);
});
test('offline quote analysis does not access form or automatically submit',()=>{
 for(const script of [js,core])assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|new\s+WebSocket|\.submit\s*\(/);
 assert.ok(html.includes('id="quote"'));
 assert.ok(!form.includes('id="quote"'));
});
test('provider privacy, retention and optional reply email are explicit',()=>{
 for(const x of ['up to 30 days','without it no reply is possible','does not read, serialize, upload, or attach the unsigned quote','anti-spam check'])
   assert.ok(form.includes(x),x);
 assert.match(form,/id="fb-consent"[^>]*required/);
 assert.ok(!form.includes('_captcha" value="false"'));
});
test('machine-readable offer catalog never treats opt-in clicks as paid customer demand',()=>{
 const o=c.offers.find(x=>x.id==='free-x402-quote-inspector');
 assert.equal(o.parser_pasted_quote_sent_by_feedback_form,false);
 assert.equal(o.actual_external_feedback_and_paying_interest_unverified,true);
 assert.ok(o.independent_buyer_voluntary_feedback_page.endsWith('#buyer-feedback'));
 assert.equal(o.automatic_quote_network_requests,0);
 assert.equal(o.price_usdc,'0.000000');
});
test('responsive design supports visible user-feedback input and bot honeypot',()=>{
 assert.ok(css.includes('.x402-feedback'));
 assert.ok(css.includes('.feedback-fields'));
 assert.ok(css.includes('.feedback-honey'));
 assert.ok(css.includes('@media(max-width:650px)'));
});
