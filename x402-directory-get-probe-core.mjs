/*
 * First-party x402 listing diagnosis using TWO FIXED, PUBLIC, UNSIGNED GETs.
 * No arbitrary URL, third-party site scan, cookies, payment, signature or auto-retry.
 * This is a client-side educational pre-payment quote check, not a paid sale.
 */
import {EXPECTED_NETWORK, EXPECTED_TOKEN, EXPECTED_RECIPIENT, EXPECTED_ATOMIC} from './x402-post-body-diagnostic-core.mjs';

export const UNQUALIFIED_DIRECTORY_URL='https://vm5-openapi-x402.onrender.com/v1/base-usdc-receipt';
export const VALID_DNS_QUOTE_URL='https://vm5-openapi-x402.onrender.com/v1/email-dns-preflight?domain=example.com';
export const DNS_QUOTE_DESCRIPTION='One optional domain MX/SPF/DMARC/A check, not inbox delivery or DKIM verification.';
const MAX_HEADER_CHARS=12000;

export function classifyDirectoryGetPair(invalidStatus, validStatus, paymentRequiredHeader) {
 const basics={kind:'x402_directory_input_required_v1',invalidStatus,validStatus,paid:false,
  signed:false,settled:false,outsideCustomerSaleProven:false,requestsMade:2};
 if(invalidStatus!==400) return Object.freeze({...basics,ok:false,code:'BARE_URL_NOT_400',
  explanation:'Current directory URL did not return expected 400. Its behavior may have changed; do not infer a purchase.'});
 if(validStatus!==402) return Object.freeze({...basics,ok:false,code:'VALID_DNS_GET_NOT_402',
  explanation:'Valid fictional domain did not produce an unsigned 402 quote; check routing, availability and CORS before offering payment.'});
 if(typeof paymentRequiredHeader!=='string' || paymentRequiredHeader.length===0 ||
    paymentRequiredHeader.length>MAX_HEADER_CHARS ||
    !/^[a-z0-9+/_-]+={0,2}$/i.test(paymentRequiredHeader) ||
    paymentRequiredHeader.length%4===1) {
   return Object.freeze({...basics,ok:false,code:'QUOTE_HEADER_MISSING_OR_INVALID',
     explanation:'A public payment quote header is absent, too large or malformed.'});
 }
 try {
   const h=paymentRequiredHeader.replace(/-/g,'+').replace(/_/g,'/');
   const bytes=Uint8Array.from(atob(h+'='.repeat((4-h.length%4)%4)),ch=>ch.charCodeAt(0));
   const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   const quote=data?.accepts?.[0];
   const matches=data?.x402Version===2 && Array.isArray(data.accepts) && data.accepts.length===1 &&
     data?.resource?.url===VALID_DNS_QUOTE_URL &&
     quote && typeof quote==='object' && !Array.isArray(quote) &&
     quote.scheme==='exact' && quote.network===EXPECTED_NETWORK && quote.amount===EXPECTED_ATOMIC &&
     typeof quote.asset==='string' && quote.asset.toLowerCase()===EXPECTED_TOKEN &&
     typeof quote.payTo==='string' && quote.payTo.toLowerCase()===EXPECTED_RECIPIENT.toLowerCase();
   if(!matches) return Object.freeze({...basics,ok:false,code:'QUOTE_OR_RESOURCE_MISMATCH',
     explanation:'The exact resource, scheme, chain, official Circle token, price or recipient differs from this known example. Do not authorize payment.'});
   return Object.freeze({...basics,ok:true,code:'GET_400_VS_GET_402_CONFIRMED',
     explanation:'Bare listed GET is input-invalid (400); a different correctly parameterized GET produces one unsigned native Base USDC 402 quote. No funds were sent or received.',
     quote:Object.freeze({network:EXPECTED_NETWORK,amountAtomic:EXPECTED_ATOMIC,
      nativeBaseCircleUSDC:'0.005000',resource:VALID_DNS_QUOTE_URL})});
 } catch {
   return Object.freeze({...basics,ok:false,code:'QUOTE_DECODE_FAILED',
     explanation:'The unsigned quote could not be safely decoded. No payment was attempted.'});
 }
}

export async function probeDirectoryGetPair(fetcher=fetch) {
 if(typeof fetcher!=='function') throw new TypeError('A fetch function is required');
 const opts={method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
  redirect:'error',referrerPolicy:'no-referrer'};
 const first=await fetcher(UNQUALIFIED_DIRECTORY_URL,{...opts,signal:AbortSignal.timeout(12000)});
 if(!first || typeof first.status!=='number') throw Error('Unknown HTTP status');
 // No payment, no signature, no user input, exactly one read of each fixed URL.
 const second=await fetcher(VALID_DNS_QUOTE_URL,{...opts,signal:AbortSignal.timeout(12000)});
 if(!second || typeof second.status!=='number') throw Error('Unknown HTTP status');
 return classifyDirectoryGetPair(first.status,second.status,
   second.headers?.get?.('payment-required') ?? null);
}
