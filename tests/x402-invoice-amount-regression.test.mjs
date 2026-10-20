import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL("../",import.meta.url));
const {analyze,parseExpectedInvoiceAmount,NATIVE_BASE_USDC}=require("../x402-inspector-core.js");
const baseInvoice=(atomic="1000000000")=>({
 x402Version:2,
 resource:{url:"https://example.invalid/one-invoice",description:"fictional independent buyer invoice",mimeType:"application/json"},
 accepts:[{scheme:"exact",network:"eip155:8453",asset:NATIVE_BASE_USDC,amount:atomic,payTo:"0x"+"1".repeat(40)}]
});
function inspect(x,cap="10000",expected="0.10"){return analyze(JSON.stringify(x),cap,expected);}
test("real-world 0.10 versus 1000 native Base USDC fails regardless of 10000USDC display cap",()=>{
 const r=inspect(baseInvoice());
 assert.equal(r.maxDisplayBudgetUSDC,"10000.000000");
 assert.equal(r.options[0].amountUSDC,"1000.000000");
 assert.equal(r.options[0].overBudget,false);
 assert.equal(r.invoiceComparison.expectedInvoiceUSDC,"0.100000");
 assert.equal(r.invoiceComparison.state,"STOP_QUOTED_AMOUNT_DIFFERS_FROM_INVOICE");
 assert.equal(r.invoiceComparison.mismatchedBaseOptions,1);
 assert.match(r.options[0].issues.join(" "),/STOP: quoted Base USDC does not equal/);
 assert.equal(r.walletInteraction,false);assert.equal(r.chargedUSDC,"0");
});
test("honest 0.10USDC amount match is display-only, not a safe-to-sign decision",()=>{
 const r=inspect(baseInvoice("100000"));
 assert.equal(r.invoiceComparison.state,"AMOUNT_MATCH_ONLY_NOT_PAYMENT_AUTHORIZATION");
 assert.equal(r.invoiceComparison.matchingBaseOptions,1);
 assert.match(r.invoiceComparison.explanation,/STILL NOT VERIFIED/);
 assert.equal(r.merchantIdentityVerified,false);
});
test("denied invoice on unrelated Lightning offer blocks quote EVEN IF BaseUSDC price matches",()=>{
 const quote=baseInvoice("100000");
 quote.accepts.push({scheme:"exact",network:"lightning:mainnet",amount:"1",asset:"lnbtc",payTo:"not-base",extra:{issuanceDenied:"invoice_not_found"}});
 const r=inspect(quote);
 assert.equal(r.invoiceComparison.matchingBaseOptions,1);
 assert.equal(r.invoiceComparison.merchantIssuanceDeniedUnverified,true);
 assert.equal(r.invoiceComparison.state,"STOP_MERCHANT_INVOICE_DENIED");
 assert.match(r.notices.join(" "),/merchant.*invoice issuance denial/);
});
test("denial marked in top-level merchant error also blocks correct Base price",()=>{
 const quote=baseInvoice("100000");quote.error="invoice_not_found";
 const r=inspect(quote);
 assert.equal(r.invoiceComparison.state,"STOP_MERCHANT_INVOICE_DENIED");
 assert.equal(r.merchantIdentityVerified,false);
});
test("no expected price preserves old display-only behavior and doesn't fake invoice approval",()=>{
 const r=analyze(JSON.stringify(baseInvoice("100000")),"0.10","");
 assert.equal(r.invoiceComparison.state,"NO_AMOUNT_COMPARISON_REQUESTED");
 assert.equal(r.invoiceComparison.expectedInvoiceUSDC,null);
 assert.equal(r.options[0].overBudget,false);
 assert.equal(r.onchainSettlementVerified,false);
});
test("expected amount parsing is exact 6 decimals, no float rounding, exponent or zero",()=>{
 assert.equal(parseExpectedInvoiceAmount("0.100000"),100000n);
 assert.equal(parseExpectedInvoiceAmount("0.000001"),1n);
 for(const v of ["-1","0","0.000000","0.1000001","1e3","NaN","Infinity","10001","1,000"])
  assert.throws(()=>parseExpectedInvoiceAmount(v),/Expected invoice amount/);
});
test("no valid Base native USDC acceptance never counts as matching an invoice",()=>{
 const other=baseInvoice("100000");other.accepts[0].network="eip155:1";
 assert.equal(inspect(other).invoiceComparison.state,"REVIEW_NO_NATIVE_BASE_USDC_OPTION");
 const wrong=baseInvoice("100000");wrong.accepts[0].asset="0x"+"2".repeat(40);
 assert.equal(inspect(wrong).invoiceComparison.state,"REVIEW_NO_NATIVE_BASE_USDC_OPTION");
});
test("multiple Base choices where ANY quoted amount differs are not silently accepted",()=>{
 const quote=baseInvoice("100000");
 quote.accepts.push({...quote.accepts[0],amount:"1000000000"});
 const r=inspect(quote);
 assert.equal(r.invoiceComparison.state,"STOP_QUOTED_AMOUNT_DIFFERS_FROM_INVOICE");
 assert.equal(r.invoiceComparison.matchingBaseOptions,1);
 assert.equal(r.invoiceComparison.mismatchedBaseOptions,1);
});
test("invalid merchant-denial metadata cannot create a real validated receipt",()=>{
 const quote=baseInvoice("100000");
 quote.accepts[0].extra={issuanceDenied:"invoice_not_found"};
 const r=inspect(quote);
 assert.equal(r.invoiceComparison.state,"STOP_MERCHANT_INVOICE_DENIED");
 assert.equal(r.chargedUSDC,"0");
 assert.equal(r.onchainSettlementVerified,false);
});
test("public quote inspector UI has buyer expected-invoice amount and zero-network/no-wallet CSP",()=>{
 const html=readFileSync(root+"x402-inspector.html","utf8");
 assert.match(html,/id="expected-invoice-usdc"/);
 assert.match(html,/Expected invoice amount/);
 assert.match(html,/1,000 USDC placeholder/);
 assert.match(html,/github\.com\/bitrefill\/agents\/issues\/11/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/form-action 'none'/);
 const source=readFileSync(root+"x402-inspector.js","utf8");
 assert.match(source,/invoiceComparison/);
 assert.match(source,/render\(analyze\(input\.value, cap\.value, expectedInvoice\.value\)\)/);
 assert.doesNotMatch(source,/fetch\s*\(|navigator\.sendBeacon|localStorage|sessionStorage|innerHTML|window\.ethereum/);
});
test("one-click fictional broken invoice fixture illustrates refusing a 1000USDC quote",()=>{
 const code=require("../x402-inspector-core.js");
 const q=code.INVOICE_MISMATCH_FIXTURE;
 const r=inspect(q);
 assert.equal(q.resource.url.includes("example.invalid"),true);
 assert.equal(r.options[0].amountUSDC,"1000.000000");
 assert.equal(r.invoiceComparison.state,"STOP_MERCHANT_INVOICE_DENIED");
 const html=readFileSync(root+"x402-inspector.html","utf8");
 const browser=readFileSync(root+"x402-inspector.js","utf8");
 assert.match(html,/id="invoice-mismatch-demo"/);
 assert.match(browser,/INVOICE_MISMATCH_FIXTURE/);
 assert.match(browser,/expectedInvoice.value = "0.10"/);
});

test("no real signed authorization, private invoice ids or wallet keys embedded in regression fixtures",()=>{
 const files=["x402-inspector-core.js","x402-inspector.js"];
 for(const p of files){
  const s=readFileSync(root+p,"utf8");
  assert.doesNotMatch(s,/privateKeyToAccount|eth_sendTransaction\s*\(|sendTransaction\s*\(|eth_signTypedData_v4\s*\(/);
 }
});
