/*
 * Original public, browser-initiated, *unsigned* x402 schema proof.
 * All HTTP requests are fixed, fictional, to our existing original VM5 seller.
 * No arbitrary target URL, buyer payload, wallet, signing, storage, or payment.
 */
export const MERCHANT_URL='https://vm5-openapi-x402.onrender.com/v1/csv-preflight';
export const EXPECTED_NETWORK='eip155:8453';
export const EXPECTED_TOKEN='0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
export const EXPECTED_RECIPIENT='0x6b01efA0705E91a7aca54271510bf9e594717f34';
export const EXPECTED_ATOMIC='5000';
const MAX_HEADER_BYTES=12000;
const TEST_BODY=JSON.stringify({csvText:'id,name\n1,Ada\n2,Lin\n',expectedColumns:['id','name']});
export const PUBLIC_ONLY_FIXTURE=Object.freeze({unpaidSample:TEST_BODY,invalidSchema:'{}'});
function safeQuote(encoded) {
  if(typeof encoded!=='string' || encoded.length===0 || encoded.length>MAX_HEADER_BYTES ||
    !/^[A-Za-z0-9+/_-]+={0,2}$/.test(encoded) || encoded.length%4===1){
    return {valid:false, reason:'Missing, malformed or oversized public PAYMENT-REQUIRED quote'};
  }
  try{
    const b64=encoded.replace(/-/g,'+').replace(/_/g,'/');
    const bytes=Uint8Array.from(atob(b64+'='.repeat((4-b64.length%4)%4)),ch=>ch.charCodeAt(0));
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(!data || typeof data!=='object' || Array.isArray(data)) throw Error('object');
    const accepts=data.accepts;
    if(data.x402Version!==2 || !Array.isArray(accepts) || accepts.length!==1) {
      return {valid:false,reason:'Expected exactly one x402 v2 payment option'};
    }
    const quote=accepts[0];
    if(!quote || typeof quote!=='object'|| Array.isArray(quote) ||
      quote.scheme!=='exact' || quote.network!==EXPECTED_NETWORK ||
      typeof quote.asset!=='string' || quote.asset.toLowerCase()!==EXPECTED_TOKEN ||
      quote.amount!==EXPECTED_ATOMIC ||
      typeof quote.payTo!=='string' || quote.payTo.toLowerCase()!==EXPECTED_RECIPIENT.toLowerCase()){
      return {valid:false,reason:'Chain, Circle USDC contract, exact price or registered recipient differs'};
    }
    if(data.resource?.url && data.resource.url!==MERCHANT_URL) {
      return {valid:false,reason:'Quoted public resource does not match intended merchant endpoint'};
    }
    return {valid:true,network:EXPECTED_NETWORK,token:EXPECTED_TOKEN,
      recipient:EXPECTED_RECIPIENT,amountAtomic:EXPECTED_ATOMIC,quotedNativeCircleBaseUSDC:'0.005000'};
  }catch{
    return {valid:false,reason:'Public quote cannot be safely decoded or verified'};
  }
}
export function classifyUnsignedResponses(invalidStatus,validStatus,publicPaymentRequiredHeader){
  if(invalidStatus!==400){
    return Object.freeze({ok:false,code:'INVALID_SCHEMA_NOT_400',
      explanation:'The intentionally invalid public example did not return HTTP 400. Check live deployment and routing before drawing conclusions.',
      invalidStatus,validStatus,paid:false,settled:false});
  }
  if(validStatus!==402){
    return Object.freeze({ok:false,code:'VALID_SCHEMA_NOT_402',
      explanation:'The complete fictional POST did not produce HTTP 402. A 200 or a redirect is not proof of payment or an x402 paywall.',
      invalidStatus,validStatus,paid:false,settled:false});
  }
  const quote=safeQuote(publicPaymentRequiredHeader);
  if(!quote.valid){
    return Object.freeze({ok:false,code:'QUOTE_FIELD_MISMATCH',
      explanation:quote.reason,invalidStatus,validStatus,paid:false,settled:false});
  }
  return Object.freeze({ok:true,code:'UNSIGNED_400_402_EXPECTED',
    explanation:'Observed a deliberate schema error (400) and the *different* correct unsigned payment challenge (402), with one exact registered Base Circle USDC offer. No payment was authorized or settled.',
    invalidStatus,validStatus,quote,paid:false,settled:false,
    outsideCustomerPurchaseProven:false,signedRequests:0});
}
export async function probeOriginalMerchant(fetcher=fetch){
  if(typeof fetcher!=='function') throw new TypeError('Explicit fetch function required');
  const common={method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
    redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'}};
  const send=async body=>{
    const resp=await fetcher(MERCHANT_URL,{...common,body,signal:AbortSignal.timeout(12000)});
    if(!resp || typeof resp.status!=='number') throw Error('Invalid response');
    return resp;
  };
  // Deliberately first exercise the same safely rejected input a buggy
  // outside x402 diagnostic may mistake for a broken paywall.
  const invalid=await send(PUBLIC_ONLY_FIXTURE.invalidSchema);
  const valid=await send(PUBLIC_ONLY_FIXTURE.unpaidSample);
  return classifyUnsignedResponses(invalid.status,valid.status,
    valid.headers?.get?.('payment-required') ?? null);
}
