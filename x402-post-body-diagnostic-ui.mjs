import {probeOriginalMerchant,MERCHANT_URL} from './x402-post-body-diagnostic-core.mjs';
const button=document.getElementById('run-diagnostic');
const output=document.getElementById('diagnostic-result');
const status=document.getElementById('diagnostic-status');
const attempts=document.getElementById('attempts');
let inFlight=false;
button.addEventListener('click',async()=>{
 if(inFlight) return;
 inFlight=true;
 button.disabled=true;
 button.textContent='Checking two fictional requests…';
 status.textContent='Contacting only the linked original VM5 example endpoint; no wallet or signer.';
 output.replaceChildren();
 try{
   const result=await probeOriginalMerchant();
   const rows=[
     ['Intentional invalid example',String(result.invalidStatus??'unknown')+' (expected HTTP 400)'],
     ['Valid unsigned fictional POST',String(result.validStatus??'unknown')+' (expected HTTP 402)'],
     ['Result',result.ok?'Expected public 400/402 split confirmed':'Needs independent developer review'],
     ['Interpretation',result.explanation],
     ['Real buyer payment','Not performed, not verified'],
   ];
   if(result.ok) rows.push(['Example merchant offer',
     '0.005000 native Circle USDC · Base (eip155:8453) · registered seller address matched']);
   const list=document.createElement('dl');
   for(const [label,value] of rows){
     const dt=document.createElement('dt');
     const dd=document.createElement('dd');
     dt.textContent=label;
     dd.textContent=value;
     list.append(dt,dd);
   }
   output.append(list);
   status.textContent=result.ok?'Completed: public schema and unsigned quote only.':'Inconclusive: do not pay or retry automatically.';
   attempts.textContent='At most two fixed, synthetic POST probes were attempted on '+MERCHANT_URL+'. A browser may also automatically preflight OPTIONS.';
 }catch{
   status.textContent='Unable to determine result. Network, CORS, timeout or merchant availability may block this browser. No payment was attempted.';
   attempts.textContent='Do not retry automatically. Check only the official seller docs or contact its operator.';
 }
 finally{
   inFlight=false;
   button.disabled=false;
   button.textContent='Run two fixed unsigned example checks';
 }
});
