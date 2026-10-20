/**
 * PaperPilot browser buyer checkout: ONE buyer-requested EIP-3009 authorization.
 * NEVER auto-sign, auto-retry, ask for secret keys, store content or self-buy.
 * Uses the foundation x402 v2 SDK for a signed request; no server mutations here.
 */
import { createWalletClient, custom, getAddress } from "viem";
import { base } from "viem/chains";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import {
  CSV_API, CHAIN_ID, RECIPIENT, USDC, NETWORK, ATOMIC_AMOUNT,
  checkCsvForRemote, decodePaymentRequired, assertExpectedQuote,
  displayPricing, assertOnePaymentSignatureRequest
} from "./csv-x402-guard.mjs";

const $=id=>document.getElementById(id);
const input=$("csv-preview-input");
const quoteBtn=$("remote-quote-btn");
const connectBtn=$("wallet-connect-btn");
const payBtn=$("remote-pay-btn");
const privacy=$("remote-upload-consent");
const consent=$("remote-payment-consent");
const status=$("remote-checkout-status");
const price=$("live-price-terms");
const paidResult=$("paid-result");
const transactionLink=$("settlement-transaction-link");
const state={quotedBody:null,quote:null,account:null,provider:null,walletChainReady:false,busy:false,paymentAttempted:false};

function show(msg,kind="info"){
  status.textContent=msg;status.dataset.state=kind;
}
function setPrice(msg) {price.textContent=msg;}
function resetQuote(){
  state.quote=null;state.quotedBody=null;
  consent.checked=false;
  setPrice("No live quote. Free local checks require no wallet and never upload CSV.");
  paidResult.textContent="No paid report requested.";
  transactionLink.hidden=true; transactionLink.removeAttribute("href");
  buttons();
}
function buttons(){
  quoteBtn.disabled=state.busy||state.paymentAttempted;
  connectBtn.disabled=state.busy||state.paymentAttempted;
  payBtn.disabled=state.busy||state.paymentAttempted||!state.quote||!state.account||
    !state.walletChainReady||!consent.checked||!privacy.checked;
}
function merchantBody(){
  return checkCsvForRemote(input.value,privacy.checked);
}
function walletProvider(){
  const p=window.ethereum;
  return p && typeof p.request==="function" ? p : null;
}
function walletDisplay(address){return address.slice(0,6)+"…"+address.slice(-4);}
async function currentWallet(){
  if (!state.provider||!state.account)throw Error("Connect the buyer's browser wallet first.");
  const chain=await state.provider.request({method:"eth_chainId"});
  if (Number(chain)!==CHAIN_ID) {
    state.walletChainReady=false;
    buttons();
    throw Error("Wallet is not on Base mainnet. Switch networks in the wallet, then reconnect.");
  }
  const addresses=await state.provider.request({method:"eth_accounts"});
  if (!Array.isArray(addresses)||addresses.length===0 ||
      !addresses.some(a=>typeof a==="string"&&a.toLowerCase()===state.account.toLowerCase())) {
    state.walletChainReady=false;
    buttons();
    throw Error("Wallet account changed. Reconnect and review the quote.");
  }
  return state.account;
}
async function readQuote(body){
  const response=await fetch(CSV_API,{
    method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
    body,cache:"no-store",credentials:"omit",redirect:"error",signal:AbortSignal.timeout(15000)
  });
  if (response.status===400)throw Error("The API rejected the CSV before asking for payment. Review its format.");
  if (response.status!==402)throw Error("No expected x402 quote. Remote check was NOT paid; server status "+response.status+".");
  return decodePaymentRequired(response.headers.get("payment-required"));
}
async function quote(){
  if(state.busy||state.paymentAttempted)return;
  state.busy=true;buttons();resetQuote();
  try{
    const body=merchantBody();
    show("Asking the separate VM5 server for an unpaid, no-signature quote…");
    const q=await readQuote(body);
    const terms=displayPricing(q);
    state.quote=q;state.quotedBody=body;
    setPrice(`Exact quote: ${terms.priceUSDC} ${terms.asset} on ${terms.chain}. Recipient: ${terms.recipient}. No payment has occurred.`);
    show("Price verified. Connecting a browser wallet is optional; you can stop now without paying.");
  }catch(e){show(e instanceof Error?e.message:"Unpaid quote unavailable.","error");}
  finally{state.busy=false;buttons();}
}
async function connect(){
  if(state.busy||state.paymentAttempted)return;
  // Connecting can prompt for a different account/network; disable buying while
  // waiting, but do not discard an already validated *unsigned* price quotation.
  state.busy=true;state.walletChainReady=false;buttons();
  try{
    const p=walletProvider();
    if(!p)throw Error("No injected EVM wallet detected. Install or open MetaMask on your own device, or use an independent x402 client.");
    // Invoked by explicit click only. No signing, no USDC transfer.
    const addresses=await p.request({method:"eth_requestAccounts"});
    if(!Array.isArray(addresses)||!addresses.length)throw Error("Wallet connection was not authorized.");
    const address=getAddress(addresses[0]);
    const chain=await p.request({method:"eth_chainId"});
    const onBase=Number(chain)===CHAIN_ID;
    state.account=address;state.provider=p;state.walletChainReady=onBase;
    // Preserve the buyer's existing same-file quote. The purchase button still
    // requires a second checkbox and buyOnce obtains an independent fresh quote
    // immediately before any EIP-712 signature.
    if (!onBase)consent.checked=false;
    show(onBase
      ? "Connected buyer wallet "+walletDisplay(address)+". Your previous price remains visible. No signature or payment was requested."
      : "Wallet connected but is not on Base (8453). Switch to Base in your wallet, then reconnect. Paying is disabled.");
  }catch(e){show(e instanceof Error?e.message:"Browser wallet connection failed.","error");}
  finally{state.busy=false;buttons();}
}

async function buyOnce(){
  if(state.busy||state.paymentAttempted||!state.quote||!state.account||
     !state.walletChainReady||!consent.checked||!privacy.checked)return;
  // Permanent one-per-page attempt guard, INCLUDING ambiguous transport/settlement failures.
  state.busy=true;state.paymentAttempted=true;buttons();
  let signingStarted=false;
  try{
    const body=merchantBody();
    if(body!==state.quotedBody)throw Error("CSV has changed. Do not sign. Refresh and request a new quote.");
    await currentWallet();
    assertExpectedQuote(state.quote);
    show("Obtaining the final fresh 0.005 USDC quote. Review the impending wallet signature.");
    const fresh=await readQuote(body);
    assertExpectedQuote(fresh);
    const account=state.account;
    const clientWallet=createWalletClient({
      chain:base,account,transport:custom(state.provider)
    });
    // Expose ONLY typed-data signature; no generic wallet tx methods or token approvals.
    const signer={
      address:account,
      async signTypedData(params){
        assertOnePaymentSignatureRequest(params,account);
        signingStarted=true;
        show("Review exactly 0.005 Base native USDC in your wallet. Reject anything else.");
        return clientWallet.signTypedData({...params,account});
      }
    };
    const client=new x402Client().register(NETWORK,new ExactEvmScheme(signer));
    const http=new x402HTTPClient(client);
    // No wrapFetchWithPayment: it may automatically retry on recovery.
    // Create one authorization and issue exactly ONE paid HTTP POST.
    const signaturePayload=await http.createPaymentPayload(fresh);
    const extraHeaders=http.encodePaymentSignatureHeader(signaturePayload);
    const headerNames=Object.keys(extraHeaders).map(s=>s.toLowerCase());
    if(headerNames.length!==1||headerNames[0]!=="payment-signature"){
      throw Error("Unexpected payment protocol headers, aborting before dispatch.");
    }
    const response=await fetch(CSV_API,{
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json",...extraHeaders},
      body,cache:"no-store",credentials:"omit",redirect:"error",signal:AbortSignal.timeout(45000)
    });
    if(response.status!==200){
      throw Error("One signed payment request was attempted and the server returned "+response.status+
        ". Settlement may be unknown. Do not retry without checking the wallet and network.");
    }
    const settle=http.getPaymentSettleResponse(name=>response.headers.get(name));
    if(settle?.success!==true||settle?.network!==NETWORK) {
      throw Error("The report returned but the expected settled Base USDC payment proof is absent. Check the original wallet and merchant before retrying.");
    }
    const report=await response.json();
    paidResult.textContent=JSON.stringify({
      notice:"Merchant reported x402 settlement. This browser display is not independent on-chain audit or bank income.",
      settlement:{success:true,network:settle.network,transaction:settle.transaction||null},
      report
    },null,2).slice(0,15000);
    if (/^0x[0-9a-fA-F]{64}$/.test(settle.transaction||"")) {
      transactionLink.href="https://basescan.org/tx/"+settle.transaction;
      transactionLink.hidden=false;
    }
    show("One buyer-authorized request returned a report with the merchant's x402 settlement response. Check the transaction independently.");
  }catch(e){
    const reason=e instanceof Error?e.message:"Unknown checkout failure.";
    show(reason+(signingStarted?" One authorization may have been signed. DO NOT click again without reviewing your wallet.":""),"error");
  }finally{
    state.busy=false;buttons();privacy.checked=false;consent.checked=false;
    // No persistence, trackers, retries or stored visitor CSV.
  }
}

input?.addEventListener("input",resetQuote);
privacy?.addEventListener("change",resetQuote);
$("csv-preview-file")?.addEventListener("change",resetQuote);
$("csv-preview-demo")?.addEventListener("click",resetQuote);
$("csv-preview-clear")?.addEventListener("click",resetQuote);
quoteBtn?.addEventListener("click",quote);
connectBtn?.addEventListener("click",connect);
consent?.addEventListener("change",buttons);
payBtn?.addEventListener("click",buyOnce);
buttons();
