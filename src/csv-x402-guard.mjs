// Browser-only pricing and one-shot USDC authorization bounds.
// No wallet is created, signed, imported or funded by this module.
export const CSV_API = "https://vm5-openapi-x402.onrender.com/v1/csv-preflight";
export const CHAIN_ID = 8453;
export const NETWORK = "eip155:8453";
export const USDC = "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913";
export const RECIPIENT = "0x6b01efA0705E91a7aca54271510bf9e594717f34";
export const ATOMIC_AMOUNT = "5000"; // 0.005 native Circle USDC (6 decimals)
export const MAX_CSV_BYTES = 32768;

export function checkCsvForRemote(csv, userAcknowledgedUpload) {
  if (userAcknowledgedUpload !== true) throw Error("Confirm that this sample may be sent to the hosted API.");
  if (typeof csv !== "string" || csv.trim().length < 4) throw Error("Enter a non-confidential CSV with a header and one data row.");
  const bytes = new TextEncoder().encode(csv).length;
  if (bytes > MAX_CSV_BYTES) throw Error("CSV exceeds the 32 KiB hosted service limit.");
  return JSON.stringify({csvText:csv});
}

export function decodePaymentRequired(header) {
  if (typeof header !== "string" || !/^[A-Za-z0-9+/_=-]{40,12000}$/.test(header)) {
    throw Error("Missing or invalid x402 payment requirement header.");
  }
  let value;
  try {
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    value = JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  } catch { throw Error("Cannot decode the merchant's payment quote."); }
  return assertExpectedQuote(value);
}

const addressEquals=(a,b)=>typeof a==="string" && a.toLowerCase()===b.toLowerCase();
export function assertExpectedQuote(quote) {
  if (!quote || typeof quote!=="object" || Array.isArray(quote) || quote.x402Version !== 2) {
    throw Error("This checkout requires x402 v2.");
  }
  if (quote.resource?.url !== CSV_API) throw Error("The requested paid service changed.");
  if (!Array.isArray(quote.accepts) || quote.accepts.length !== 1) {
    throw Error("Unexpected number of payment options. No signature will be requested.");
  }
  const offer=quote.accepts[0];
  if (offer?.scheme!=="exact" || offer?.network!==NETWORK ||
      !addressEquals(offer.asset,USDC) || !addressEquals(offer.payTo,RECIPIENT) ||
      offer.amount!==ATOMIC_AMOUNT || !Number.isInteger(offer.maxTimeoutSeconds) ||
      offer.maxTimeoutSeconds<1 || offer.maxTimeoutSeconds>600 ||
      offer.extra?.name!=="USD Coin" || String(offer.extra.version)!=="2" ||
      (offer.extra.assetTransferMethod != null && offer.extra.assetTransferMethod!=="eip3009")) {
    throw Error("The live price, wallet destination, chain, token or authorization type differs from the verified offer. Do not sign.");
  }
  return quote;
}
export function displayPricing(quote) {
  assertExpectedQuote(quote);
  return Object.freeze({
    priceUSDC:"0.005", chain:"Base mainnet (8453)", asset:"native Circle USDC",
    token:USDC, recipient:RECIPIENT
  });
}

export function assertOnePaymentSignatureRequest(data,buyerAddress,nowSeconds=Math.floor(Date.now()/1000)){
  if (!/^0x[a-fA-F0-9]{40}$/.test(buyerAddress||"")) throw Error("Invalid buyer wallet.");
  const domain=data?.domain||{};
  const m=data?.message||{};
  if (data?.primaryType!=="TransferWithAuthorization" ||
      domain.name!=="USD Coin" || String(domain.version)!=="2" ||
      Number(domain.chainId)!==CHAIN_ID ||
      !addressEquals(domain.verifyingContract,USDC) ||
      !addressEquals(m.from,buyerAddress) ||
      !addressEquals(m.to,RECIPIENT) ||
      String(m.value)!==ATOMIC_AMOUNT ||
      !/^0x[0-9a-fA-F]{64}$/.test(m.nonce||"")) {
    throw Error("The wallet signature does not match this exact one-time USDC purchase. Signing stopped.");
  }
  let after, before;
  try {after=BigInt(m.validAfter);before=BigInt(m.validBefore);}
  catch {throw Error("Invalid payment validity window.");}
  if (after>BigInt(nowSeconds+90) || before<=BigInt(nowSeconds) ||
      before>BigInt(nowSeconds+900) || after>=before) {
    throw Error("USDC authorization time window is not safe.");
  }
  return true;
}
