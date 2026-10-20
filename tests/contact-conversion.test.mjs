import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const ROOT=dirname(dirname(fileURLToPath(import.meta.url)));
const services=readFileSync(join(ROOT,"services.html"),"utf8");
const contact=readFileSync(join(ROOT,"contact.html"),"utf8");
const handler=readFileSync(join(ROOT,"contact.js"),"utf8");
const origin="https://livastic-vm1-primary.github.io/paperpilot-tools/";

const serviceCategories=[
  ["invoice","Bilingual invoice or quote template"],
  ["utility","Offline browser utility"],
  ["qa","Playwright browser QA"],
  ["x402-cors","x402 merchant CORS and quote QA"],
  ["workspace-invoice","Google Workspace Gmail Drive invoice intake QA"]
];

function renderSelection(param){
  const state={value:"",setCount:0};
  const fakeSelect={
    options:serviceCategories.map(([,value])=>({value})).concat([{value:"Other project"}]),
    get value(){return state.value},
    set value(v){state.value=v;state.setCount++;}
  };
  let count=0;
  const pageURL=origin+"contact.html"+(param===null?"":"?service="+encodeURIComponent(param));
  const context={URL,window:{location:{href:pageURL}},
    document:{getElementById:(id)=>{count++;return id==="f-service"?fakeSelect:null;}}};
  runInNewContext(handler,context);
  return {...state,domLookups:count};
}

test("exact five distinct in-site paid-service inquiry routes",()=>{
  const links=[...services.matchAll(/<a class="service-contact" href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(links,serviceCategories.map(([key])=>"contact.html?service="+key));
  assert.ok(!links.some(x=>x.startsWith("mailto:")));
});

test("same activated, consent-first original email form endpoint remains",()=>{
  assert.match(contact,/form id="project-inquiry-form" action="https:\/\/formsubmit\.co\/onecursor1@gmail\.com" method="POST"/);
  assert.match(contact,/name="third_party_form_consent"[^>]*required/);
  assert.match(contact,/name="email"[^>]*type="email"[^>]*required/);
  assert.match(contact,/name="_honey"/);
});

test("local service-select script only loaded once on inquiry page",()=>{
  assert.equal((contact.match(/<script src="contact\.js" defer><\/script>/g)||[]).length,1);
  assert.ok(!services.includes('src="contact.js"'));
});

for(const [key,expected] of serviceCategories){
  test("valid category "+key+" preselects only public service",()=>{
    const x=renderSelection(key);
    assert.equal(x.value,expected);
    assert.equal(x.setCount,1);
    assert.equal(x.domLookups,1);
  });
}

test("unrecognized or missing categories never change the form",()=>{
  for(const query of [null,"","admin","../../secrets","<img src=x>", "constructor"]){
    const x=renderSelection(query);
    assert.equal(x.setCount,0);
    assert.equal(x.value,"");
    assert.equal(x.domLookups,0);
  }
});

test("service preselection cannot modify credentials, email, consent, network",()=>{
  assert.doesNotMatch(handler,/fetch\s*\(|XMLHttpRequest|sendBeacon|document\.cookie|localStorage|sessionStorage|eval\s*\(|innerHTML|\.submit\s*\(/);
  assert.doesNotMatch(handler,/getElementById\(['"]f-email|f-consent|f-hidden/);
  const x=renderSelection("qa");
  assert.equal(x.setCount,1);
});

test("no misrepresented checkout or generated payment occurs",()=>{
  assert.match(contact,/No active paid checkout/);
  assert.ok(services.includes("not an accepted order or binding contract"));
});
