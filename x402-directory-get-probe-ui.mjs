import {probeDirectoryGetPair,UNQUALIFIED_DIRECTORY_URL,VALID_DNS_QUOTE_URL} from './x402-directory-get-probe-core.mjs';

const button=document.getElementById('run-directory-get');
const status=document.getElementById('directory-get-status');
const out=document.getElementById('directory-get-result');
let busy=false;
button.addEventListener('click',async()=>{
 if(busy) return;
 busy=true; button.disabled=true; out.replaceChildren();
 status.textContent='Checking only two fixed public, unsigned GET responses. No payment or wallet access.';
 try{
   const r=await probeDirectoryGetPair();
   const rows=[
     ['Bare, incomplete resource',String(r.invalidStatus)+' (expect 400)'],
     ['Valid fictional domain',String(r.validStatus)+' (expect 402)'],
     ['Unsigned verification',r.ok?'Expected x402 v2 quote fields matched':'Unknown or different; do not pay'],
     ['Explanation',r.explanation],
     ['Buyer funds / customer order','None spent, signed or proven'],
   ];
   if(r.ok) rows.push(['Example price','0.005000 native Circle USDC on Base; quote only']);
   const dl=document.createElement('dl');
   for(const [key,value] of rows){
     const dt=document.createElement('dt'), dd=document.createElement('dd');
     dt.textContent=key;dd.textContent=value;dl.append(dt,dd);
   }
   out.append(dl);
   status.textContent=r.ok?'The public quote is discoverable by using the valid resource URL. No purchase occurred.':
     'Quote is inconclusive or changed. Do not retry paid requests automatically.';
 }catch{
   status.textContent='Unable to inspect public quote due to network, CORS, timeout or endpoint availability. No payment was attempted.';
 }finally{
   busy=false;button.disabled=false;
 }
});
const examples=document.getElementById('directory-get-targets');
examples.textContent='Read-only example URLs: '+UNQUALIFIED_DIRECTORY_URL+' ; '+VALID_DNS_QUOTE_URL;
