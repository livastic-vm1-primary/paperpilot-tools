/**
 * PaperPilot original FIRST-PARTY and publicly reproducible unpaid CSV API
 * conformance probe: only OPTIONS + ONE unsigned synthetic POST.
 *
 * CAUTION: This does not make an actual USDC purchase, verify an outside
 * checkout, handle private financial files, or establish merchant settlement.
 * There is no wallet code, no Payment-Signature, no retries, and no accounts.
 */
import {pathToFileURL} from 'node:url';
import {
 CSV_API, NETWORK, USDC, RECIPIENT, ATOMIC_AMOUNT,
 syntheticUnpaidQuoteBody, SYNTHETIC_UNPAID_QUOTE_CSV, decodePaymentRequired, displayPricing,
} from '../src/csv-x402-guard.mjs';

export const ORIGINAL_SITE_ORIGIN = 'https://livastic-vm1-primary.github.io';
export const FIXED_FICTIONAL_CSV = SYNTHETIC_UNPAID_QUOTE_CSV;

function expectedOrigin(headers) {
 const actual=headers.get('access-control-allow-origin');
 if (actual!=='*' && actual!==ORIGINAL_SITE_ORIGIN) {
   throw Error('The merchant did not declare CORS permission for the first-party buyer site.');
 }
 return actual;
}
function csvHeaderHas(headers,headerName,token) {
 return String(headers.get(headerName)||'').split(',').map(x=>x.trim().toLowerCase()).includes(token.toLowerCase());
}

/**
 * The caller MUST supply its own explicitly chosen fetch function.
 * Importing this file NEVER calls any network, browser wallet, or RPC.
 */
export async function inspectUnpaidCsvCheckout(fetcher,now=new Date()) {
 if (typeof fetcher!=='function') throw new TypeError('Explicit fetcher needed');
 if (!(now instanceof Date)||!Number.isFinite(now.getTime())) throw new TypeError('Bounded observation time required');
 const options=await fetcher(CSV_API,{
   method:'OPTIONS',
   headers:{
     Origin:ORIGINAL_SITE_ORIGIN,
     'Access-Control-Request-Method':'POST',
     'Access-Control-Request-Headers':'content-type'
   },
   redirect:'error',
   credentials:'omit',
   cache:'no-store'
 });
 if (![200,204].includes(options?.status))throw Error('Expected free CORS preflight was refused.');
 expectedOrigin(options.headers);
 if (!csvHeaderHas(options.headers,'access-control-allow-methods','POST') ||
     !csvHeaderHas(options.headers,'access-control-allow-headers','content-type'))
   throw Error('Browser cannot dispatch the quoted CSV POST from this site.');

 const body=syntheticUnpaidQuoteBody();
 const response=await fetcher(CSV_API,{
   method:'POST',
   headers:{Origin:ORIGINAL_SITE_ORIGIN,'Content-Type':'application/json','Accept':'application/json'},
   body,
   redirect:'error',
   credentials:'omit',
   cache:'no-store'
 });
 if (response?.status!==402)throw Error('Expected exactly an unpaid x402 HTTP 402 response.');
 expectedOrigin(response.headers);
 if(!csvHeaderHas(response.headers,'access-control-expose-headers','payment-required'))
   throw Error('Browser cannot read the merchant PAYMENT-REQUIRED header.');

 const header=response.headers.get('payment-required');
 // Reuse EXACT same public buyer-checkout security guard as the web UI:
 // strict URL, version, only one exact Base USDC accept, amount and payTo.
 const quote=decodePaymentRequired(header);
 const pricing=displayPricing(quote);
 if(pricing.recipient.toLowerCase()!==RECIPIENT.toLowerCase()||
    quote.accepts?.[0]?.amount!==ATOMIC_AMOUNT||
    quote.accepts?.[0]?.network!==NETWORK||
    quote.accepts?.[0]?.asset?.toLowerCase()!==USDC.toLowerCase())
   throw Error('The original merchant quote no longer matches the checked buyer price.');

 return Object.freeze({
   checkedUTC:now.toISOString(),
   exactOriginalMerchantUrl:CSV_API,
   buyerOrigin:ORIGINAL_SITE_ORIGIN,
   network:NETWORK,
   nativeCircleBaseUSDC:USDC,
   quoteRecipient:pricing.recipient,
   quotedNativeCircleBaseUSDC:pricing.priceUSDC,
   expectedAtomicUSDC:ATOMIC_AMOUNT,
   corsPreflightHttpStatus:options.status,
   unsignedPostHttpStatus:response.status,
   observedEncodedPaymentRequiredBytes:new TextEncoder().encode(header).length,
   checks:['original_source_CORS_allows_POST','original_source_exposes_PAYMENT_REQUIRED',
     'exact_x402_v2_price_token_chain_recipient','synthetic_body_only','no_wallet_or_payment_signature'],
   independentlyPaidCsvPostBuyerFound:false,
   independentOnchainSettlementVerified:false,
   userWalletFundsMoved:false,
   actualNewReceivedUSDC:'0',
   interpretation:'ONE free unsigned 402 quote passed; actual buyer wallet payment, paid CSV report and external token finality NOT tested.'
 });
}

// Explicit owner/operator invocation only, NEVER as an import or website load.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
 if (process.argv.length!==3 || process.argv[2]!=='--live-unsigned-check') {
   process.stderr.write('Explicit opt-in required: node examples/verify-csv-x402-unpaid.mjs --live-unsigned-check\n');
   process.exitCode=2;
 } else {
   const safeFetch=async (url, init)=>{
     const controller=AbortSignal.timeout(15000);
     return fetch(url,{...init,signal:controller});
   };
   try {
     const result=await inspectUnpaidCsvCheckout(safeFetch);
     process.stdout.write(JSON.stringify(result,null,2)+'\n');
   } catch(e) {
     process.stderr.write('Unpaid quote check not certified: '+(e instanceof Error?e.message:'Unknown failure')+'\n');
     process.exitCode=1;
   }
 }
}
