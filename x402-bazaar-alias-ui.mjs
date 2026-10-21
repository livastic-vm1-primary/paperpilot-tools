import {analyzeBazaarText,DEMO_BAZAAR_OBJECT,DEMO_ALIAS_GROUPS} from './x402-bazaar-alias-core.mjs';
const input=document.getElementById('bazaar-json');
const groups=document.getElementById('bazaar-alias-groups');
const output=document.getElementById('bazaar-alias-results');
const status=document.getElementById('bazaar-alias-status');
const analyze=document.getElementById('analyze-bazaar-aliases');
const demo=document.getElementById('load-alias-demo');
const clear=document.getElementById('clear-bazaar-aliases');
function line(parent,key,value){
 const row=document.createElement('div');row.className='check-line';
 const strong=document.createElement('strong');strong.textContent=key;
 const span=document.createElement('span');span.textContent=value;
 row.append(strong,span);parent.append(row);
}
demo.addEventListener('click',()=>{
 input.value=JSON.stringify(DEMO_BAZAAR_OBJECT,null,2);
 groups.value=DEMO_ALIAS_GROUPS;
 status.textContent='Fictional demo ready. Click Check locally. No request has been sent.';
 output.replaceChildren();
});
clear.addEventListener('click',()=>{
 input.value='';groups.value='';output.replaceChildren();
 status.textContent='Cleared. No data was sent or stored.';
});
analyze.addEventListener('click',()=>{
 output.replaceChildren();
 const r=analyzeBazaarText(input.value,groups.value);
 if(!r.ok){status.textContent='Local check unavailable: '+r.message;return}
 status.textContent=r.collisionCount?r.collisionCount+' developer-declared alias collision(s) detected.':
   'No collisions within declared groups; this is NOT proof of runtime or schema correctness.';
 line(output,'Scope',r.method+' · '+r.checkedPaths.join(', '));
 line(output,'What we know',r.explanation);
 for(const [i,f] of r.findings.entries()){
   const section=document.createElement('section');section.className='finding';
   const heading=document.createElement('h3');heading.textContent='Collision '+(i+1)+' · '+f.path;
   section.append(heading);
   line(section,'Present alias fields',f.names.join(' / '));
   line(section,'Example values',f.sameValues?
     'Identical serialized values; wrong-key edits remain possible.':
     'Different serialized values; the handler may ignore some input values.');
   line(section,'Developer-declared priority (UNVERIFIED)',f.declaredSourcePriority.join(' → '));
   line(section,'Suggested fix',f.remediation);
   output.append(section);
 }
});
