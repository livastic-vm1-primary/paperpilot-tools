/* PaperPilot x402 browser CORS preflight, 2026. AI-assisted.
 * Pure offline processing of merchant-owned public OPTIONS response headers.
 * No network, wallet, payment, login, retries or user credentials.
 */
import {readFileSync} from "node:fs";

export const MAX_RESPONSE_BYTES = 16384;
const METHODS = new Set(["GET","POST"]);
const HEADER_NAME = /^[a-z0-9!#$%&'*+.^_|~-]+$/i;
const SENSITIVE = new Set(["authorization","proxy-authorization","payment-signature","x-payment","cookie","set-cookie"]);

export function parseOptionsHeaders(raw) {
  if(typeof raw!=="string"||!raw.trim())throw Error("Expected one public HTTP OPTIONS response.");
  if(Buffer.byteLength(raw,"utf8")>MAX_RESPONSE_BYTES)throw Error("Input exceeds 16 KiB header limit.");
  // Fail closed if someone accidentally pastes a signed request or credentials
  // anywhere in a curl dump, including past the end of its response headers.
  if(/(?:^|\r?\n)(?:authorization|proxy-authorization|payment-signature|x-payment|cookie|set-cookie)\s*:/im.test(raw)){
    throw Error("Do not paste credentials or a payment signature.");
  }
  const sections=raw.replaceAll("\r\n","\n").split(/\n\n/);
  let block;
  for(const candidate of sections){
    if(/^HTTP\/(?:1(?:\.[01])?|2(?:\.0)?|3)\s+\d{3}\b/i.test(candidate.trimStart()))block=candidate.trim();
  }
  if(!block)throw Error("HTTP OPTIONS status line is required.");
  const rows=block.split("\n");
  const status=/^HTTP\/(?:1(?:\.[01])?|2(?:\.0)?|3)\s+(\d{3})\b/i.exec(rows[0].trim());
  if(!status)throw Error("Invalid HTTP status line.");
  const headers=new Map();
  for(const line of rows.slice(1)){
    if(!line.trim())continue;
    if(/^[ \t]/.test(line))throw Error("Folded HTTP headers are not accepted.");
    const colon=line.indexOf(":");
    if(colon<1)throw Error("Malformed HTTP header.");
    const name=line.slice(0,colon).trim().toLowerCase();
    const value=line.slice(colon+1).trim();
    if(!HEADER_NAME.test(name))throw Error("Invalid header name.");
    if(SENSITIVE.has(name))throw Error("Do not paste credentials or a payment signature.");
    if(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value))throw Error("HTTP control characters are not accepted.");
    const list=headers.get(name)||[];
    list.push(value);headers.set(name,list);
  }
  const one=name=>{
    const values=headers.get(name)||[];
    if(values.length>1)throw Error("Duplicate CORS response header: "+name);
    return values[0]||"";
  };
  return {
    status:Number(status[1]),
    allowOrigin:one("access-control-allow-origin"),
    allowMethods:one("access-control-allow-methods"),
    allowHeaders:one("access-control-allow-headers"),
    exposeHeaders:one("access-control-expose-headers"),
    allowCredentials:one("access-control-allow-credentials")
  };
}
const words=value=>new Set(String(value).split(",").map(x=>x.trim().toLowerCase()).filter(Boolean));

export function reviewOptions(raw,{origin,method="POST",requestHeaders=["content-type","payment-signature"]}={}){
  let buyerOrigin;
  try{buyerOrigin=new URL(origin);}catch{throw Error("Expected a valid buyer Origin.");}
  const localhost=buyerOrigin.protocol==="http:"&&["localhost","127.0.0.1"].includes(buyerOrigin.hostname);
  if((buyerOrigin.protocol!=="https:"&&!localhost)||buyerOrigin.username||buyerOrigin.password||
     buyerOrigin.pathname!=="/"||buyerOrigin.search||buyerOrigin.hash) {
    throw Error("Use an HTTPS buyer Origin without a path or credentials (localhost allowed in development).");
  }
  if(!METHODS.has(method))throw Error("Only GET/POST browser preflight is inspected.");
  if(!Array.isArray(requestHeaders)||requestHeaders.length<1||requestHeaders.length>12||
     !requestHeaders.every(h=>typeof h==="string"&&h.length<80&&HEADER_NAME.test(h))) {
    throw Error("Supply 1-12 request header names, never values or secrets.");
  }
  const requested=[...new Set(requestHeaders.map(h=>h.toLowerCase()))];
  const response=parseOptionsHeaders(raw);
  const allowedMethods=words(response.allowMethods);
  const allowedHeaders=words(response.allowHeaders);
  const originOkay=response.allowOrigin===buyerOrigin.origin||response.allowOrigin==="*";
  const methodOkay=allowedMethods.has(method.toLowerCase())||allowedMethods.has("*");
  const statusOkay=response.status>=200&&response.status<300;
  const missing=requested.filter(h=>!allowedHeaders.has(h)&&!allowedHeaders.has("*"));
  const warnings=[];
  if(!statusOkay)warnings.push("HTTP OPTIONS was not 2xx: browser preflight cannot succeed.");
  if(!originOkay)warnings.push("Access-Control-Allow-Origin does not match the buyer Origin.");
  if(!methodOkay)warnings.push("Access-Control-Allow-Methods omits the intended method.");
  if(missing.length)warnings.push("Access-Control-Allow-Headers omits at least one requested header.");
  if(allowedHeaders.has("*"))warnings.push("Wildcard allowed-headers may behave differently for credentialed requests.");
  if(response.allowOrigin==="*"&&response.allowCredentials.toLowerCase()==="true")warnings.push("Wildcard origin fails for credentialed requests; this audit assumes credentials: omit.");
  if(!words(response.exposeHeaders).has("payment-required"))warnings.push("The OPTIONS response lacks PAYMENT-REQUIRED exposure metadata; confirm the actual unsigned 402 response separately.");
  return {
    kind:"paperpilot_offline_x402_browser_cors_preflight_v1",
    buyerOrigin:buyerOrigin.origin,
    buyerMethod:method,
    requestedHeaderNames:requested,
    optionsHttpStatus:response.status,
    safeResponseCors:{
      allowOrigin:response.allowOrigin,
      allowMethods:response.allowMethods,
      allowHeaders:response.allowHeaders,
      exposeHeaders:response.exposeHeaders
    },
    missingHeaderNames:missing,
    preflightAppearsCompatible:statusOkay&&originOkay&&methodOkay&&missing.length===0,
    warnings,networkRequests:0,walletInteracted:false,
    chargedUSDC:"0",outsideCustomerPaymentConfirmed:false,
    caveat:"This checks public OPTIONS headers only. A 204, even when compatible, does not prove browser signing, payment retry, merchant identity, HTTP200 fulfillment or on-chain settlement."
  };
}

const runningAsCli=process.argv[1]&&new URL("file://"+process.argv[1]).href===import.meta.url;
if(runningAsCli){
  const args=process.argv.slice(2);
  if(args.includes("--help")||args.length===0){
    process.stdout.write("Offline owner-authorized OPTIONS response checker: curl public OPTIONS headers | node tools/x402-browser-cors-preflight.mjs --origin https://your-buyer-ui.example [--method POST] [--headers content-type,payment-signature]. NO network or wallet action in this script.\n");
  }else{
    const get=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];};
    try{
      const report=reviewOptions(readFileSync(0,"utf8"),{
        origin:get("--origin"),
        method:get("--method")||"POST",
        requestHeaders:(get("--headers")||"content-type,payment-signature").split(",")
      });
      process.stdout.write(JSON.stringify(report,null,2)+"\n");
      if(!report.preflightAppearsCompatible)process.exitCode=2;
    }catch(e){
      process.stderr.write("Offline x402 CORS check: "+(e instanceof Error?e.message:"Bad input")+"\n");
      process.exitCode=2;
    }
  }
}
