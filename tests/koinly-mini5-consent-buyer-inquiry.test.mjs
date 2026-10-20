import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const form=read('contact.html'),logic=read('contact.js'),service=read('services.html');
const preview=read('koinly-column-mapper.html'),rescue=read('crypto-csv-rescue.html');
const offer='https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/koinly-csv-one-source-mapping-mini-review-5usdc.md';
const category='Koinly one-source 10-row manual CSV map (5 Base USDC proposed)';
const landing='contact.html?service=koinly-mini-5';
test('one genuine existing HashN mini seller offer referenced, not an invented product',()=>{
 assert.ok(service.includes(offer));
 assert.ok(preview.includes(offer));
 assert.ok(rescue.includes(offer));
 assert.ok(service.includes('Existing original one-owner'));
 assert.match(service,/not escrow, a wallet payment link, guaranteed delivery or evidence of buyers/);
});
test('existing consented FormSubmit route remains, no wallet/private user upload',()=>{
 assert.match(form, /action="https:\/\/formsubmit\.co\/onecursor1@gmail\.com"/);
 assert.match(form,/id="f-consent"[^>]+required/);
 assert.match(form,/name="_honey"/);
 assert.doesNotMatch(form,/<input\b[^>]+type="file"/);
 assert.doesNotMatch(form,/window\.ethereum|eth_sendTransaction|payment-signature/i);
});
test('mini5 unique service card has exactly ONE matching safe inquiry link',()=>{
 assert.equal((service.match(/id="koinly-mini-review-5"/g)||[]).length,1);
 assert.equal((service.match(/class="service-contact" href="contact.html\?service=koinly-mini-5"/g)||[]).length,1);
 assert.ok(service.includes('Proposed <strong>5 native Base USDC</strong>'));
 assert.ok(service.includes('not a checkout or confirmed order'));
 assert.match(service,/No HashN account|without HashN login/i);
});
test('free mapper and broader rescue link directly to same no-login lead',()=>{
 assert.ok(preview.includes('href="'+landing+'"'));
 assert.ok(rescue.includes('href="'+landing+'"'));
 assert.ok(service.includes('href="koinly-column-mapper.html"'));
});
test('form public category matches source guard and synthetic limits',()=>{
 assert.ok(form.includes('value="'+category+'"'));
 assert.ok(logic.includes("'koinly-mini-5': '"+category+"'"));
 assert.match(service,/no more than 10 wholly synthetic or deidentified sample rows/);
 assert.match(service,/no invented missing trades, prices or cost basis/);
});
test('public query preselector changes ONLY one category',()=>{
 let value='',setCount=0,readCount=0;
 const select={options:[{value:category}],
    set value(v){value=v;setCount++;},get value(){return value;}};
 runInNewContext(logic,{
  URL,window:{location:{href:'https://livastic-vm1-primary.github.io/paperpilot-tools/contact.html?service=koinly-mini-5'}},
  document:{getElementById(id){readCount++;return id==='f-service'?select:null;}}
 });
 assert.equal(value,category);
 assert.equal(setCount,1);
 assert.equal(readCount,1);
});
test('untrusted query cannot modify private fields or send network',()=>{
 assert.doesNotMatch(logic,/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|eval\s*\(|innerHTML|\.submit\s*\(/);
 let changed=false;
 runInNewContext(logic,{URL,window:{location:{href:'https://livastic-vm1-primary.github.io/paperpilot-tools/contact.html?service=__proto__'}},document:{getElementById:()=>{changed=true;}}});
 assert.equal(changed,false);
});
test('no invented purchase or up-front private file transmission',()=>{
 assert.match(service,/Agree source rights, acceptance, possible cancellation\/refund/);
 assert.match(service,/BEFORE any money or private CSV is sent/);
 assert.match(service,/not an accepted order or binding contract/);
 assert.match(read('llms.txt'),/no independent purchase, settled token or accepted contract/);
});
test('5 BaseUSDC mini is distinct from bigger 49 USD and Trade-ID 15 BaseUSDC',()=>{
 assert.ok(service.includes('Trade-ID duplicate exception review'));
 assert.ok(service.includes('Crypto CSV'));
 assert.match(read('llms.txt'),/Existing larger 49 USD Crypto CSV Rescue and 15 BaseUSDC Trade-ID reports/);
 assert.ok(!service.includes('5 XNO mini-review'));
});
