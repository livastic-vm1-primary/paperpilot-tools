import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {x402Client,x402HTTPClient} from "@x402/fetch";
import {ExactEvmScheme} from "@x402/evm/exact/client";
import {
 CSV_API,USDC,NETWORK,RECIPIENT,CHAIN_ID,ATOMIC_AMOUNT,
 checkCsvForRemote, decodePaymentRequired, assertExpectedQuote,
 displayPricing,assertOnePaymentSignatureRequest
} from "../src/csv-x402-guard.mjs";
const buyer="0x1111111111111111111111111111111111111111";
const data='id,name\n1,Ada\n2,Lin\n';
const sample = () => ({
 x402Version:2,
 resource:{url:CSV_API,description:"Synthetic CSV, NOT an invoice",mimeType:"application/json"},
 accepts:[{scheme:"exact",network:NETWORK,amount:ATOMIC_AMOUNT,asset:USDC,payTo:RECIPIENT,maxTimeoutSeconds:300,extra:{name:"USD Coin",version:"2"}}],
 extensions:{bazaar:{info:{}}}
});
function mutate(value,func){const copy=structuredClone(value);func(copy);return copy;}
function typed(args={}){
 const now=Math.floor(Date.now()/1000);
 return {
   domain:{name:"USD Coin",version:"2",chainId:CHAIN_ID,verifyingContract:USDC},
   primaryType:"TransferWithAuthorization",
   types:{TransferWithAuthorization:[
     {name:"from",type:"address"},{name:"to",type:"address"},{name:"value",type:"uint256"},
     {name:"validAfter",type:"uint256"},{name:"validBefore",type:"uint256"},{name:"nonce",type:"bytes32"}
   ]},
   message:{from:buyer,to:RECIPIENT,value:BigInt(ATOMIC_AMOUNT),
           validAfter:BigInt(now-60),validBefore:BigInt(now+300),nonce:"0x"+"12".repeat(32)},
   ...args
 };
}
test("buyer explicitly opts into any remote upload and byte limit is bounded",()=>{
 assert.throws(()=>checkCsvForRemote(data,false),/Confirm/);
 assert.deepEqual(JSON.parse(checkCsvForRemote(data,true)),{csvText:data});
 assert.throws(()=>checkCsvForRemote("id\n"+"가".repeat(11000),true),/32 KiB/);
 assert.throws(()=>checkCsvForRemote("",true),/CSV/);
});
test("exact live published one-owner Base USDC terms accepted",()=>{
 const terms=displayPricing(sample());
 assert.equal(terms.priceUSDC,"0.005");assert.equal(terms.asset,"native Circle USDC");
 assert.equal(terms.token,USDC);assert.equal(terms.recipient,RECIPIENT);
});
test("protocol header base64 decoded without trusting external JSON",()=>{
 const encoded=Buffer.from(JSON.stringify(sample())).toString("base64");
 assert.equal(decodePaymentRequired(encoded).accepts[0].amount,"5000");
 assert.throws(()=>decodePaymentRequired(""),/invalid/);
 assert.throws(()=>decodePaymentRequired(Buffer.from("{}").toString("base64")),/invalid|x402 v2/);
 assert.throws(()=>decodePaymentRequired("A".repeat(15000)),/invalid/);
});
test("strict paid quote rejects a wrong chain",()=>assert.throws(
 ()=>assertExpectedQuote(mutate(sample(),q=>{q.accepts[0].network="eip155:84532"})),/differs/));
test("strict paid quote rejects a non-Circle or bridged USDC asset",()=>assert.throws(
 ()=>assertExpectedQuote(mutate(sample(),q=>{q.accepts[0].asset="0x"+"22".repeat(20)})),/differs/));
test("strict paid quote rejects a diverted payment recipient",()=>assert.throws(
 ()=>assertExpectedQuote(mutate(sample(),q=>{q.accepts[0].payTo="0x"+"33".repeat(20)})),/differs/));
test("strict paid quote rejects any changed price, even lower",()=>{
 for(const amount of ["4999","5001","0"]){
  assert.throws(()=>assertExpectedQuote(mutate(sample(),q=>{q.accepts[0].amount=amount})),/differs/);
 }
});
test("strict paid quote rejects a deceptive/multiple/silent payment option",()=>{
 const m=sample();m.accepts.push({...m.accepts[0]});
 assert.throws(()=>assertExpectedQuote(m),/payment options/);
});
test("strict quote rejects unsupported protocol or service and extension payment schemes",()=>{
 assert.throws(()=>assertExpectedQuote(mutate(sample(),q=>{q.x402Version=1})),/requires x402 v2/);
 assert.throws(()=>assertExpectedQuote(mutate(sample(),q=>{q.resource.url="https://evil.example/api"})),/changed/);
 assert.throws(()=>assertExpectedQuote(mutate(sample(),q=>{q.accepts[0].extra.assetTransferMethod="permit2"})),/differs/);
});
test("strict quote rejects surprising expiry or domain version",()=>{
 assert.throws(()=>assertExpectedQuote(mutate(sample(),q=>{q.accepts[0].maxTimeoutSeconds=86400})),/differs/);
 assert.throws(()=>assertExpectedQuote(mutate(sample(),q=>{q.accepts[0].extra.version="999"})),/differs/);
});
test("EIP-712 buyer signature is limited to exactly one 5000-atomic Base USDC transfer",()=>{
 assert.equal(assertOnePaymentSignatureRequest(typed(),buyer),true);
});
test("EIP-712 signature guard rejects overspend, wrong wallet, wrong recipient, wrong USDC",()=>{
 assert.throws(()=>assertOnePaymentSignatureRequest(typed({message:{...typed().message,value:5001n}}),buyer),/does not match/);
 assert.throws(()=>assertOnePaymentSignatureRequest(typed({message:{...typed().message,from:"0x"+"44".repeat(20)}}),buyer),/does not match/);
 assert.throws(()=>assertOnePaymentSignatureRequest(typed({message:{...typed().message,to:"0x"+"55".repeat(20)}}),buyer),/does not match/);
 assert.throws(()=>assertOnePaymentSignatureRequest(typed({domain:{...typed().domain,verifyingContract:"0x"+"66".repeat(20)}}),buyer),/does not match/);
});
test("EIP-712 signature guard rejects unexpected method or stale/huge validity window",()=>{
 assert.throws(()=>assertOnePaymentSignatureRequest(typed({primaryType:"Permit"}),buyer),/does not match/);
 assert.throws(()=>assertOnePaymentSignatureRequest(typed({message:{...typed().message,validBefore:BigInt(Math.floor(Date.now()/1000)+86400)}}),buyer),/not safe/);
 assert.throws(()=>assertOnePaymentSignatureRequest(typed({message:{...typed().message,validBefore:1n}}),buyer),/not safe/);
});
test("official SDK constructs signed x402 payload in-memory from simulated signer only; no network, no tokens spent",async()=>{
 const attempts=[];
 const fakeSigner={
   address:buyer,
   async signTypedData(m){
     assertOnePaymentSignatureRequest(m,buyer);
     attempts.push({amount:String(m.message.value),to:m.message.to,contract:m.domain.verifyingContract});
     return "0x"+"ab".repeat(65); // NOT a real ECDSA signature. NEVER dispatch.
   }
 };
 const client=new x402Client().register(NETWORK,new ExactEvmScheme(fakeSigner));
 const http=new x402HTTPClient(client);
 const payload=await http.createPaymentPayload(sample());
 const headers=http.encodePaymentSignatureHeader(payload);
 assert.deepEqual(Object.keys(headers),["PAYMENT-SIGNATURE"]);
 assert.equal(attempts.length,1);
 assert.equal(attempts[0].amount,"5000");
 assert.equal(attempts[0].to.toLowerCase(),RECIPIENT.toLowerCase());
 assert.equal(payload.x402Version,2);
});
test("public buyer page separates free from remote and independently authorized payment",()=>{
 const root=fileURLToPath(new URL("../",import.meta.url));
 const page=readFileSync(root+"csv-usdc-checkout.html","utf8");
 for(const id of ["csv-preview-input","csv-preview-check","csv-preview-demo","csv-preview-clear","remote-quote-btn","remote-upload-consent","wallet-connect-btn","remote-payment-consent","remote-pay-btn","paid-result"])
  assert.match(page,new RegExp('id="'+id+'"'),id);
 assert.match(page,/Pay 0\.005 USDC once/);
 assert.match(page,/No automatic repeat/);
 assert.match(page,/untested-with-real-wallet beta/);
 assert.match(page,/"remote-pay-btn" class="btn pay" disabled/);
 assert.match(page,/script src="csv-local-preview.js" defer/);
 assert.match(page,/script type="module" src="csv-wallet-checkout.bundle.js"/);
});
test("buyer wallet JS cannot auto-retry, sign on page load, use secrets or create ERC20 approvals",()=>{
 const root=fileURLToPath(new URL("../",import.meta.url));
 const s=readFileSync(root+"src/csv-wallet-checkout-entry.mjs","utf8");
 for(const e of ["wrapFetchWithPayment(","window.localStorage","sessionStorage","privateKeyToAccount","walletClient.sendTransaction","eth_sendTransaction","wallet_addEthereumChain","wallet_switchEthereumChain","wallet_watchAsset","approve(","signTransaction("])
   assert.equal(s.includes(e),false,e);
 assert.match(s,/state.paymentAttempted=true/);
 assert.match(s,/const response=await fetch\(CSV_API/);
 assert.match(s,/signTypedData/);
 assert.match(s,/assertOnePaymentSignatureRequest/);
 assert.match(s,/assertExpectedQuote\(fresh\)/);
});
test("public catalog and marketing link label no established paid POST buyer",()=>{
 const root=fileURLToPath(new URL("../",import.meta.url));
 const catalog=JSON.parse(readFileSync(root+"catalog.json","utf8"));
 const app=catalog.offers.find(o=>o.id==="buyer-owned-base-usdc-csv-browser-checkout");
 assert.equal(app.price_native_circle_usdc,"0.005000");
 assert.equal(app.real_wallet_paid_settlement_browser_integration_tested,false);
 assert.equal(app.confirmed_independent_paid_POST_customers,0);
 assert.equal(app.automatic_paid_retry,false);
 const sitemap=readFileSync(root+"sitemap.xml","utf8");
 assert.match(sitemap,/csv-usdc-checkout.html/);
 const llms=readFileSync(root+"llms.txt","utf8");
 assert.match(llms,/human browser USDC checkout \(beta\)/);
});


test("wallet connection keeps the displayed unsigned live quote instead of forcing a second upload",()=>{
 const root=fileURLToPath(new URL("../",import.meta.url));
 const src=readFileSync(root+"src/csv-wallet-checkout-entry.mjs","utf8");
 const body=src.split("async function connect(){")[1].split("async function buyOnce(){")[0];
 assert.match(body,/state\.walletChainReady=onBase/);
 assert.doesNotMatch(body,/resetQuote\(\)/);
 assert.match(body,/Your previous price remains visible/);
});
test("buyer payment button and click handler both require Base wallet and both explicit consents",()=>{
 const root=fileURLToPath(new URL("../",import.meta.url));
 const src=readFileSync(root+"src/csv-wallet-checkout-entry.mjs","utf8");
 assert.match(src,/!state\.walletChainReady\|\|!consent\.checked\|\|!privacy\.checked/);
 assert.match(src,/!state\.walletChainReady\|\|!consent\.checked\|\|!privacy\.checked\)return;/);
 assert.match(src,/state\.walletChainReady=false;\s*buttons\(\);\s*throw Error\("Wallet is not on Base/);
});
