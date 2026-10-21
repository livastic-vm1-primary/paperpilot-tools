/*
 * Entirely local x402 Bazaar example alias checker.
 * A discovery sample alone cannot reveal which names a merchant's handler
 * treats as aliases or which key wins; operator-declared groups are required.
 * No remote requests, payment, scripts, credentials or wallet access.
 */
export const ALIAS_INPUT_BYTE_LIMIT=32768;
export const ALIAS_GROUP_BYTE_LIMIT=4096;
export const DEMO_BAZAAR_OBJECT=Object.freeze({
 x402Version:2,
 extensions:{bazaar:{info:{input:{type:'http',method:'POST',bodyType:'json',
  body:{q:'bitcoin etf',query:'ethereum etf',text:'defi daily'}}}}}
});
export const DEMO_ALIAS_GROUPS='q, query, text';
const BAD_KEYS=new Set(['__proto__','prototype','constructor']);
const KEY_RX=/^[A-Za-z][A-Za-z0-9_-]{0,79}$/;
const methodsBody=new Set(['POST','PUT','PATCH']);
const methodsQuery=new Set(['GET','HEAD','DELETE']);
function own(o,k){return !!o && typeof o==='object'&&!Array.isArray(o)&&Object.hasOwn(o,k)}
function plain(o){return o!==null&&typeof o==='object'&&!Array.isArray(o)}
function fail(code,message){return Object.freeze({ok:false,code,message,findings:Object.freeze([]),checkedPaths:Object.freeze([]),paid:false,submitted:false})}
function sizeBytes(x){return new TextEncoder().encode(x).byteLength}
function fieldNames(raw){
 if(typeof raw!=='string')throw Error('Alias groups must be newline-separated text.');
 if(sizeBytes(raw)>ALIAS_GROUP_BYTE_LIMIT)throw Error('Alias declaration exceeds 4 KiB.');
 const groups=raw.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'));
 if(groups.length<1||groups.length>20)throw Error('Declare between 1 and 20 alias groups from YOUR handler source.');
 const used=new Set(),result=[];
 for(const [i,line] of groups.entries()){
  const names=line.split(/[,|]/).map(x=>x.trim());
  if(names.length<2||names.length>12||names.some(x=>!KEY_RX.test(x)||BAD_KEYS.has(x)))
   throw Error('Group '+(i+1)+': provide 2–12 safe, comma-separated names such as q,query,text.');
  if(new Set(names).size!==names.length)throw Error('Group '+(i+1)+': repeated name inside one group.');
  for(const name of names){
   if(used.has(name))throw Error('Alias name '+name+' appears in more than one group; declare a disjoint grouping.');
   used.add(name);
  }
  result.push(Object.freeze(names));
 }
 return Object.freeze(result);
}
export function parseAliasGroups(raw){return fieldNames(raw)}
export function unwrapBazaarInput(manifest){
 if(!plain(manifest))return null;
 const input=manifest?.extensions?.bazaar?.info?.input ??
  manifest?.bazaar?.info?.input ?? manifest?.info?.input ?? manifest?.input ?? null;
 return plain(input)?input:null;
}
export function analyzeBazaarAliases(manifest,rawGroups){
 let groups;
 try{groups=Array.isArray(rawGroups)?fieldNames(rawGroups.map(g=>Array.isArray(g)?g.join(','):'').join('\n')):fieldNames(rawGroups)}
 catch(e){return fail('BAD_DECLARATION',e.message)}
 const input=unwrapBazaarInput(manifest);
 if(!input)return fail('NO_INPUT','No Bazaar info.input was found. Use extensions.bazaar.info.input or a standalone documented info.input.');
 if(input.type!=='http')return fail('UNSUPPORTED_INPUT','This check covers HTTP examples only, not MCP tool arguments.');
 const method=input.method;
 if(typeof method!=='string'||(!methodsBody.has(method)&&!methodsQuery.has(method)))
  return fail('UNSUPPORTED_METHOD','Expected one HTTP method: GET, HEAD, DELETE, POST, PUT or PATCH.');
 const candidates=[];
 for(const p of ['body','queryParams']){
  if(own(input,p)){
   if(!plain(input[p]))return fail('NON_OBJECT_EXAMPLE',p+' must be a JSON object for this alias-field check.');
   candidates.push(Object.freeze({path:'info.input.'+p,value:input[p]}));
  }
 }
 if(methodsBody.has(method)&&!own(input,'body'))
  return fail('MISSING_BODY','Body method has no body object example; no aliases to inspect.');
 if(!candidates.length)
  return fail('NO_EXAMPLE','No body or queryParams object example was declared.');
 const findings=[];
 let presentGroups=0;
 for(const {path,value} of candidates){
  for(const group of groups){
   const present=group.filter(x=>own(value,x));
   if(present.length)presentGroups++;
   if(present.length<2)continue;
   const vals=present.map(x=>JSON.stringify(value[x]));
   findings.push(Object.freeze({
    path,names:Object.freeze(present),
    sameValues:vals.every(v=>v===vals[0]),
    declaredSourcePriority:Object.freeze(group),
    verifiedHandlerPrecedence:false,
    remediation:'Inspect the actual merchant handler and publish only the ONE name it reads first; do not assume priority from example JSON.'
   }));
  }
 }
 return Object.freeze({
  ok:true,code:findings.length?'DUPLICATE_DECLARED_ALIASES':'NO_DECLARED_ALIAS_COLLISIONS',
  method,checkedPaths:Object.freeze(candidates.map(x=>x.path)),declaredGroupCount:groups.length,
  presentGroupCount:presentGroups,findings:Object.freeze(findings),collisionCount:findings.length,
  paid:false,submitted:false,serverRequested:false,canonicalFieldVerified:false,
  explanation:findings.length?
   'Two or more developer-declared aliases appear in one example. A buyer may edit a field the server ignores. Confirm the real handler precedence before editing the sample.':
   'No duplicate in DECLARED groups. Undeclared aliases, real handler precedence, runtime behavior and schema validity were not checked.'
 });
}
export function analyzeBazaarText(jsonText,aliasesText){
 if(typeof jsonText!=='string'||sizeBytes(jsonText)>ALIAS_INPUT_BYTE_LIMIT)
  return fail('JSON_TOO_LARGE','Only public, unsigned JSON up to 32 KiB is accepted.');
 let parsed;
 try{parsed=JSON.parse(jsonText)}catch{return fail('INVALID_JSON','Paste valid public JSON without merchant credentials or signed headers.')}
 return analyzeBazaarAliases(parsed,aliasesText);
}
