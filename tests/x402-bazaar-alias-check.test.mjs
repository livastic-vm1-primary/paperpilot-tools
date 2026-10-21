import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseAliasGroups,analyzeBazaarAliases,analyzeBazaarText,unwrapBazaarInput,
 DEMO_BAZAAR_OBJECT,DEMO_ALIAS_GROUPS,ALIAS_INPUT_BYTE_LIMIT,ALIAS_GROUP_BYTE_LIMIT} from '../x402-bazaar-alias-core.mjs';
const doc={extensions:{bazaar:{info:{input:{type:'http',method:'POST',bodyType:'json',
 body:{q:'hello',query:'ignored',text:'also ignored'}}}}}};
const content=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const valid=(body,queryParams,method='POST')=>{
 const input={type:'http',method,bodyType:'json'};
 if(body!==undefined)input.body=body;
 if(queryParams!==undefined)input.queryParams=queryParams;
 return {info:{input}};
};
test('source declaration and fictional example flag the three-key alias risk',()=>{
 const r=analyzeBazaarAliases(DEMO_BAZAAR_OBJECT,DEMO_ALIAS_GROUPS);
 assert.equal(r.ok,true);assert.equal(r.code,'DUPLICATE_DECLARED_ALIASES');
 assert.equal(r.collisionCount,1);
 assert.deepEqual(r.findings[0].names,['q','query','text']);
 assert.equal(r.findings[0].path,'info.input.body');
 assert.equal(r.findings[0].verifiedHandlerPrecedence,false);
 assert.equal(r.canonicalFieldVerified,false);
 assert.equal(r.paid,false);assert.equal(r.submitted,false);assert.equal(r.serverRequested,false);
});
test('conflicting aliases and same-valued aliases both yield finding',()=>{
 const conflicting=analyzeBazaarAliases(doc,'q,query');
 assert.equal(conflicting.findings[0].sameValues,false);
 const equal=analyzeBazaarAliases(valid({q:'same',query:'same'}),'q, query');
 assert.equal(equal.findings[0].sameValues,true);
 assert.equal(equal.collisionCount,1);
});
test('only one known source alias in example is not a collision',()=>{
 const r=analyzeBazaarAliases(valid({query:'hello'}),'q,query,text');
 assert.equal(r.ok,true);assert.equal(r.collisionCount,0);
 assert.equal(r.code,'NO_DECLARED_ALIAS_COLLISIONS');
 assert.match(r.explanation,/not checked/i);
});
test('different logical parameters are not confused',()=>{
 const r=analyzeBazaarAliases(valid({query:'hello',lang:'en'}),'q,query,text\nlanguage,lang');
 assert.equal(r.ok,true);assert.equal(r.collisionCount,0);
});
test('both GET queryParams and POST queryParams are supported',()=>{
 const a=analyzeBazaarAliases(valid(undefined,{q:'hi',query:'hi'},'GET'),'q,query');
 const b=analyzeBazaarAliases(valid({id:'x'}, {q:'hi',query:'hi'},'POST'),'q,query');
 assert.equal(a.ok,true);assert.equal(a.collisionCount,1);
 assert.deepEqual(a.checkedPaths,['info.input.queryParams']);
 assert.equal(b.ok,true);assert.equal(b.collisionCount,1);
});
test('POST having both conflicting body and query groups counts separately',()=>{
 const r=analyzeBazaarAliases(valid({q:'a',query:'b'},{q:'c',query:'d'}),'q,query');
 assert.equal(r.ok,true);assert.equal(r.collisionCount,2);
 assert.deepEqual(r.checkedPaths,['info.input.body','info.input.queryParams']);
});
test('GET, HEAD, DELETE inspect example; unsupported methods fail closed',()=>{
 for(const method of ['GET','HEAD','DELETE']){
  const r=analyzeBazaarAliases(valid(undefined,{q:'a',query:'b'},method),'q,query');
  assert.equal(r.ok,true);
 }
 for(const method of ['POSTS','TRACE','','get',null,42]){
  const r=analyzeBazaarAliases(valid({q:'a',query:'b'},null,method),'q,query');
  assert.equal(r.ok,false);assert.equal(r.code,'UNSUPPORTED_METHOD');
 }
});
test('POST, PUT, PATCH accept example body; missing body is explicit unsupported',()=>{
 for(const method of ['POST','PUT','PATCH']){
  assert.equal(analyzeBazaarAliases(valid({q:'a',query:'b'},undefined,method),'q,query').collisionCount,1);
  assert.equal(analyzeBazaarAliases(valid(undefined,{},method),'q,query').code,'MISSING_BODY');
 }
});
test('query-only absent example does not falsely prove a clean catalog',()=>{
 const r=analyzeBazaarAliases({info:{input:{type:'http',method:'GET'}}},'q,query');
 assert.equal(r.ok,false);assert.equal(r.code,'NO_EXAMPLE');
});
test('unsupported MCP and malformed HTTP discovery fail closed',()=>{
 const items=[
  {manifest:{info:{input:{type:'mcp',toolName:'search',example:{q:'hi',query:'hi'}}}},code:'UNSUPPORTED_INPUT'},
  {manifest:{info:{input:null}},code:'NO_INPUT'},
  {manifest:null,code:'NO_INPUT'},
  {manifest:[],code:'NO_INPUT'},
  {manifest:{info:{input:{type:'http',method:'POST',body:'str'}}},code:'NON_OBJECT_EXAMPLE'},
  {manifest:{info:{input:{type:'http',method:'POST',body:[]}}},code:'NON_OBJECT_EXAMPLE'},
  {manifest:{info:{input:{type:'http',method:'GET',queryParams:'q=hi'}}},code:'NON_OBJECT_EXAMPLE'},
 ];
 for(const item of items){
  const r=analyzeBazaarAliases(item.manifest,'q,query');
  assert.equal(r.ok,false);assert.equal(r.code,item.code);
 }
});
test('supports full public 402 envelope, root bazaar, bare info and bare input',()=>{
 const input=doc.extensions.bazaar.info.input;
 const variants=[
  doc,{bazaar:{info:{input}}},{info:{input}},{input}
 ];
 for(const item of variants){
  assert.deepEqual(unwrapBazaarInput(item),input);
  assert.equal(analyzeBazaarAliases(item,'q,query').collisionCount,1);
 }
});
test('separate alias groups cannot reuse one name',()=>{
 for(const g of ['q,query\nquery,text','q,query\n q,text','q,q','q,q\ntext,query']){
  const r=analyzeBazaarAliases(doc,g);
  assert.equal(r.ok,false);assert.equal(r.code,'BAD_DECLARATION');
 }
});
test('invalid/prototype-pollution-like alias declaration rejected before property reads',()=>{
 for(const g of ['q,__proto__','prototype,q','constructor,q','q,a.b','q,[x]','q,','q','q,\n','q,\u0000key','\n\n',' q , !bad ']){
  const r=analyzeBazaarAliases(doc,g);
  assert.equal(r.ok,false);assert.equal(r.code,'BAD_DECLARATION');
 }
});
test('valid source group order is labeled DECLARED and never automatically accepted as verified',()=>{
 const r=analyzeBazaarAliases(doc,'text, query, q');
 assert.deepEqual(r.findings[0].declaredSourcePriority,['text','query','q']);
 assert.equal(r.findings[0].verifiedHandlerPrecedence,false);
 assert.equal(r.canonicalFieldVerified,false);
});
test('odd valid JSON values do not escape as HTML or mutate original input',()=>{
 const input={q:'<img src=x onerror=alert(1)>',query:'<script>alert(1)</script>'};
 const doc=valid(input);
 const before=JSON.stringify(doc);
 const r=analyzeBazaarAliases(doc,'q,query');
 assert.equal(r.ok,true);assert.equal(r.collisionCount,1);
 assert.equal(JSON.stringify(doc),before);
 assert.equal(Object.hasOwn(r.findings[0],'value'),false);
});
test('group parser handles comma and pipe, ignores comment/blank lines',()=>{
 const g=parseAliasGroups('# comment\n q | query | text\n\n lang,language ');
 assert.deepEqual(g,[['q','query','text'],['lang','language']]);
});
test('over twenty groups and more than twelve names per group fail closed',()=>{
 const many=Array.from({length:21},(_,i)=>'a'+i+',b'+i).join('\n');
 assert.equal(analyzeBazaarAliases(doc,many).code,'BAD_DECLARATION');
 const tooMany=Array.from({length:13},(_,i)=>'n'+i).join(',');
 assert.equal(analyzeBazaarAliases(doc,tooMany).code,'BAD_DECLARATION');
});
test('UTF8 size limits reject excessive unsigned quote or groups',()=>{
 const json='{"input":'+JSON.stringify('한'.repeat(11000))+'}';
 assert.ok(new TextEncoder().encode(json).length>ALIAS_INPUT_BYTE_LIMIT);
 assert.equal(analyzeBazaarText(json,'q,query').code,'JSON_TOO_LARGE');
 assert.ok('a'.repeat(ALIAS_GROUP_BYTE_LIMIT+1).length>4096);
 assert.equal(analyzeBazaarAliases(doc,'a,'.concat('z'.repeat(ALIAS_GROUP_BYTE_LIMIT))).code,'BAD_DECLARATION');
});
test('bad JSON has stable localized errors, no exception leaked',()=>{
 for(const input of ['', '{','nullish','[1,2,]','{"x":undefined}']){
  const r=analyzeBazaarText(input,'q,query');
  assert.equal(r.ok,false);assert.equal(r.code,'INVALID_JSON');
 }
});
test('valid JSON text path returns same collision verdict',()=>{
 const x=analyzeBazaarText(JSON.stringify(doc),'q,query,text');
 assert.equal(x.ok,true);assert.equal(x.collisionCount,1);
});
test('on original static page browser never posts, signs, tracks or executes untrusted HTML',()=>{
 const html=content('x402-bazaar-alias-check.html');
 const ui=content('x402-bazaar-alias-ui.mjs');
 const core=content('x402-bazaar-alias-core.mjs');
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/script-src 'self'/);
 assert.equal((html.match(/src="x402-bazaar-alias-ui\.mjs"/g)||[]).length,1);
 assert.match(html,/id="bazaar-json"/);
 assert.match(html,/id="bazaar-alias-groups"/);
 assert.match(html,/id="analyze-bazaar-aliases"/);
 assert.match(html,/id="load-alias-demo"/);
 assert.match(html,/id="clear-bazaar-aliases"/);
 assert.match(html,/id="bazaar-alias-status" aria-live="polite"/);
 assert.match(ui,/addEventListener\('click'/);
 assert.match(ui,/\.textContent=/);
 assert.doesNotMatch(ui,/innerHTML|sendBeacon|fetch\(|XMLHttpRequest|localStorage|sessionStorage|\.request\(|\.submit\(/);
 assert.doesNotMatch(core,/fetch\(|XMLHttpRequest|eth_send|window\.ethereum|localStorage|sessionStorage/i);
 assert.doesNotMatch(html,/<form\b|<input\b|<iframe\b/i);
});
test('public content credits independent external user need, links only existing paid product',()=>{
 const html=content('x402-bazaar-alias-check.html');
 assert.match(html,/x402-foundation\/x402\/issues\/3841/);
 assert.match(html,/not an official x402 validator/);
 assert.match(html,/49 native Circle Base USDC/);
 assert.match(html,/indicative/);
 assert.match(html,/No independent paying customer/);
 assert.match(html,/source/i);
 assert.match(html,/Never|Do not paste/);
});
test('site links are accessible and sitemap includes the free page once',()=>{
 const newFile='x402-bazaar-alias-check.html';
 const diag=content('x402-post-body-diagnostic.html');
 const svc=content('services.html');
 const sitemap=content('sitemap.xml');
 const llms=content('llms.txt');
 for(const text of [diag,svc,sitemap,llms]){
  assert.ok(text.includes(newFile));
 }
 assert.equal((sitemap.match(/x402-bazaar-alias-check\.html/g)||[]).length,1);
});
