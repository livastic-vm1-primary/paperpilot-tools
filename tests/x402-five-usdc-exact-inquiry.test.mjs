import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const get = name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const services=get('services.html'),form=get('contact.html'),selectorScript=get('contact.js');
const id='x402-agent-review-5';
const value='x402 v2 Base Circle USDC LangChain/AgentKit fixed-scope QA (5 native Base USDC per review)';
function simulate(q) {
  const options=[...form.matchAll(/<option\b[^>]*value="([^"]*)"/g)].map(m=>({value:m[1]}));
  let selected='',assignments=0,touched=[];
  const fakeSelect={
    options,
    get value(){return selected;},
    set value(v){selected=v;assignments++;}
  };
  const url='https://livastic-vm1-primary.github.io/paperpilot-tools/contact.html'+
    (q===null?'':'?service='+encodeURIComponent(q));
  runInNewContext(selectorScript,{
    URL,window:{location:{href:url}},
    document:{getElementById(id){touched.push(id);return id==='f-service'?fakeSelect:null;}}
  });
  return {selected,assignments,touched,options:options.map(o=>o.value)};
}
test('fixed 5-USDC service card links its distinct matching inquiry, not the 149-dollar Playwright QA',()=>{
  const block=services.slice(services.indexOf('<p id="'+id+'"'),
    services.indexOf('</p>',services.indexOf('<p id="'+id+'"'))+4);
  assert.match(block,/5 native Circle Base USDC per review/);
  assert.equal(block.split('href="contact.html?service='+id+'"').length-1,1);
  assert.doesNotMatch(block,/href="contact\.html\?service=qa"/);
  assert.match(block,/HashN offer \(5 USDC \/ one read-only review\)/);
});
test('inquiry form has a single accurate 5-USDC category, separate from 49USDC and Playwright',()=>{
  assert.equal(form.split('value="'+value+'"').length-1,1);
  assert.match(form,/x402 Base USDC LangChain·AgentKit 연동 8항목 QA \(5 USDC \/ 1건\)/);
  const {options}=simulate(null);
  assert.ok(options.includes(value));
  assert.ok(options.includes('Playwright browser QA'));
  assert.ok(options.includes('x402 merchant CORS and quote QA'));
});
test('new CTA actually preselects exact 5 USDC original owner offer via public no-login JavaScript',()=>{
  const out=simulate(id);
  assert.equal(out.selected,value);
  assert.equal(out.assignments,1);
  assert.deepEqual(out.touched,['f-service']);
});
test('existing independent Playwright 149-dollar inquiry remains a distinct working category',()=>{
  const out=simulate('qa');
  assert.equal(out.selected,'Playwright browser QA');
  assert.equal(out.assignments,1);
});
test('unknown or attacker-controlled query cannot populate credentials or choose unsupported services',()=>{
  for(const q of ['__proto__','constructor','../../wallets','x402-agent-review-5<script>',null,'']){
    const out=simulate(q);
    assert.equal(out.assignments,0,String(q));
    assert.equal(out.selected,'');
    assert.deepEqual(out.touched,[]);
  }
  assert.doesNotMatch(selectorScript,/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|document\.cookie|localStorage|sessionStorage|innerHTML|eval\s*\(|\.submit\s*\(/);
});
test('original confidential inquiry form, consent and human email channel remain unchanged',()=>{
  assert.match(form,/form id="project-inquiry-form" action="https:\/\/formsubmit.co\/onecursor1@gmail.com" method="POST"/);
  assert.match(form,/name="third_party_form_consent"[^>]*required/);
  assert.match(form,/type="email" maxlength="180" autocomplete="email"/);
  assert.match(form,/name="_honey"/);
  assert.match(form,/name="project_goal" rows="5" minlength="15"/);
  assert.match(form,/문의는 주문이나 유료 계약이 아닙니다/);
});
test('other previously linked crypto QA offers and the original HashN offer stay reachable',()=>{
  assert.ok(services.includes('href="contact.html?service=qa"')); // generic Playwright
  assert.ok(services.includes('href="contact.html?service=x402-agent-review-5"'));
  assert.ok(services.includes('https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/x402-base-usdc-agentkit-langchain-fixed-qa-5usdc.md'));
});
