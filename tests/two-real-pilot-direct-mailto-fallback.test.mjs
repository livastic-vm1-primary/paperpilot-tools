import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
function linkFor(page, service) {
  const html = read(page);
  const links = Array.from(html.matchAll(/href="(mailto:[^"]+)"/g), match=>match[1].replaceAll('&amp;','&'));
  assert.equal(links.length,1,'one original direct email fallback in ' + page);
  const url = new URL(links[0]);
  assert.equal(url.protocol,'mailto:');
  assert.equal(url.pathname,'onecursor1@gmail.com');
  const subj = url.searchParams.get('subject');
  const body = url.searchParams.get('body');
  assert.ok(subj.includes(service),subj);
  assert.ok(body.includes('no customer data') || body.includes('no private tax data'));
  assert.ok(body.includes('written scope'));
  assert.doesNotMatch(body,/0x[a-f0-9]{40}/i);
  assert.doesNotMatch(body,/private key|seed phrase|recovery phrase/i);
  return {html,subj,body};
}
test('existing Base USDC invoice matching free page has working own-email-app merchant quote fallback',()=>{
  const {html}=linkFor('usdc-invoice-reconcile.html','USDC invoice');
  assert.match(html,/If the third-party FormSubmit form does not finish/);
  assert.match(html,/no message is sent until you choose Send/);
  assert.match(html,/contact\.html\?service=usdc-invoice-pilot/);
  assert.match(html,/not proven demand/);
});
test('existing crypto CSV rescue genuine $49 page has consent-neutral direct-email fallback',()=>{
  const {html}=linkFor('crypto-csv-rescue.html','Crypto CSV Rescue');
  assert.match(html,/third-party form fails/);
  assert.match(html,/not sent until you choose Send/);
  assert.match(html,/contact\.html\?service=crypto-csv-rescue/);
  assert.match(html,/No independent customer order/);
});
test('central owner contact form remains optional and activated recipient unchanged, with direct mailto escape route',()=>{
  const html=read('contact.html');
  assert.match(html,/action="https:\/\/formsubmit.co\/onecursor1@gmail.com"/);
  assert.match(html,/name="third_party_form_consent"[^>]*required/);
  assert.match(html,/mailto:onecursor1@gmail.com\?subject=PaperPilot/);
  assert.match(html,/실제 발송은 이용자가 직접 선택/);
  assert.match(html,/문의는 주문이나 유료 계약이 아닙니다/);
});
