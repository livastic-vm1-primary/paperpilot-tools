import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const html = name => readFileSync(join(ROOT,name),'utf8');
const form = html('contact.html');
const preselector = html('contact.js');
const expected = {
  'x402-audit': 'x402 merchant CORS and quote QA',
  'x402-postpayment-qa': 'x402 post-payment response and duplicate-charge evidence review (quote first)'
};
function pageFor(key) {
  const options=[...form.matchAll(/<option\b[^>]*value="([^"]*)"/g)].map(m=>m[1]);
  let touchedFields=[];
  let value = '';
  let assignments = 0;
  const select={options:options.map(value=>({value})),
    get value(){return value},
    set value(v){assignments++;value=v}
  };
  runInNewContext(preselector,{URL,
    window:{location:{href:'https://livastic-vm1-primary.github.io/paperpilot-tools/contact.html?service='+encodeURIComponent(key)}},
    document:{getElementById(id){touchedFields.push(id);return id==='f-service'?select:null;}}
  });
  return {value,assignments,touchedFields,options};
}
test('all four real original x402 service links carry a recognized selectable intent',()=>{
  const x402audit=html('x402-post-body-diagnostic.html');
  const paid=html('paid-engineering-proof.html');
  const incident=html('x402-inspector.html');
  assert.equal((x402audit.match(/contact\.html\?service=x402-audit/g)||[]).length,1);
  assert.equal((paid.match(/contact\.html\?service=x402-audit/g)||[]).length,2);
  assert.equal((incident.match(/contact\.html\?service=x402-postpayment-qa/g)||[]).length,1);
  for (const [key,option] of Object.entries(expected)) {
    const v=pageFor(key);
    assert.equal(v.value,option,key);
    assert.equal(v.assignments,1,key);
    assert.deepEqual(v.touchedFields,['f-service'],key);
    assert.ok(v.options.includes(option),key);
  }
});
test('every first-party internal contact.html?service link resolves to a real form option',()=>{
 const files=readdirSync(ROOT).filter(n=>n.endsWith('.html'));
 const hrefs=[];
 for(const file of files)
   for(const m of html(file).matchAll(/href="contact\.html\?service=([^"]+)"/g))
      hrefs.push([file,m[1]]);
 assert.ok(hrefs.length>=20,'Must audit original site lead sources');
 for(const [file,key] of hrefs) {
    const v=pageFor(decodeURIComponent(key));
    assert.equal(v.assignments,1,file+' -> '+key+' must actually preselect once');
    assert.ok(v.options.includes(v.value),file+' -> '+key+' absent dropdown option');
 }
});
test('blocked unknown categories and prototype pollution never select a service or touch private form fields',()=>{
 for(const key of ['__proto__','constructor','prototype','x402-audit<script>','x402-nonexistent']){
  const v=pageFor(key);
  assert.equal(v.assignments,0,key);
  assert.deepEqual(v.touchedFields,[],key);
 }
});
test('FormSubmit owner contact and consent/privacy remain unaltered by the fix',()=>{
 assert.match(form,/form id="project-inquiry-form" action="https:\/\/formsubmit\.co\/onecursor1@gmail\.com" method="POST"/);
 assert.match(form,/name="third_party_form_consent"[^>]+required/);
 assert.match(form,/name="_honey"/);
 assert.match(form,/name="email" type="email"/);
 assert.doesNotMatch(preselector,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|ethereum\.request|innerHTML|\.submit\s*\(/);
});
test('post-payment incident is a quote first, not wallet payment or debt claim',()=>{
 assert.match(form,/x402 post-payment response and duplicate-charge evidence review \(quote first\)/);
 assert.match(form,/문의는 주문이나 유료 계약이 아닙니다/);
 assert.match(html('x402-inspector.html'),/without payment headers or private data/i);
});
