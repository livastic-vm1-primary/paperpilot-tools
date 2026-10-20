/**
 * Free browser-local x402 post-payment incident triage. Deterministic advisory
 * only: does not connect to a wallet, decode signed payments, query an RPC,
 * attest settlement, or authorize / recommend an automatic payment retry.
 * The three statuses are all user-reported, not verified by this software.
 */
const signedOptions = new Set(["no", "yes", "unknown"]);
const chainOptions = new Set(["confirmed", "not_confirmed", "unknown"]);
const deliveryOptions = new Set(["valid_delivered", "failed_or_invalid", "unknown"]);
const HASH = /^0x[0-9a-fA-F]{64}$/;

function select(value, allowed, label) {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new TypeError("Choose a documented " + label + " state.");
  }
  return value;
}

export function triageX402Incident({signed, onchain, delivery, publicBaseTxHash = ""} = {}) {
  signed = select(signed, signedOptions, "signature");
  onchain = select(onchain, chainOptions, "on-chain");
  delivery = select(delivery, deliveryOptions, "delivery");
  if (typeof publicBaseTxHash !== "string" || publicBaseTxHash.length > 66) {
    throw new TypeError("Optional transaction hash must be a single public Base 0x hash.");
  }
  const tx = publicBaseTxHash.trim();
  if (tx && !HASH.test(tx)) {
    throw new TypeError("Enter only a public 0x plus 64-hex-character Base transaction hash; never a payment signature.");
  }
  let status, explanation, steps;
  if ((signed === "no" && onchain === "confirmed") ||
      (signed === "no" && delivery === "valid_delivered" && onchain === "confirmed")) {
    status = "CONFLICTING_EVIDENCE";
    explanation = "You reported no signature but a confirmed payment. Those could be different events or an observation error; do not attribute them to the same purchase.";
    steps = ["Match the original request, amount, payer, payee, chain and timestamp through your own trusted wallet/explorer.", "Obtain the merchant's order or receipt and reconcile with the single public transaction.", "Do not send another signature to diagnose the mismatch."];
  } else if (onchain === "confirmed" && delivery === "valid_delivered") {
    status = "REPORTED_PAYMENT_AND_DELIVERY";
    explanation = "You report a confirmed chain transaction and usable delivery. This page did not inspect either; never count it as independently verified settlement.";
    steps = ["Retain the original seller response and transaction proof.", "Check the payment and delivery against the order and your own records.", "Do not repeat a completed purchase to test the seller."];
  } else if (onchain === "confirmed" && delivery === "failed_or_invalid") {
    status = "REPORTED_SETTLED_BUT_DELIVERY_FAILED";
    explanation = "You report on-chain settlement but unusable or missing delivery. A merchant 500/timeout or incorrect JSON does not reverse an already-settled token transfer.";
    steps = ["STOP: never sign a second charge for the same order without independent reconciliation.", "Save the request identifier, non-secret error/status, expected output and on-chain public transaction hash.", "Contact the merchant for original delivery, dispute handling or a voluntary refund; neither refund nor entitlement is guaranteed.", "If serious, seek professional payment or legal advice; do not share wallet seed, EIP-3009 signature or bearer token."];
  } else if (onchain === "confirmed") {
    status = "REPORTED_SETTLEMENT_DELIVERY_UNKNOWN";
    explanation = "You report a confirmed payment; delivery has not been established. Checking the transaction alone does not prove the service was delivered.";
    steps = ["Hold the original transaction/receipt evidence.", "Check the merchant's original request/status endpoint without reauthorizing payment.", "Ask the merchant to reconcile and deliver the same paid order.", "Do not approve another signed payment while delivery remains uncertain."];
  } else if (signed === "yes" || signed === "unknown") {
    status = "POTENTIALLY_PAID_UNRESOLVED";
    explanation = "The wallet signature or chain outcome is uncertain. A timeout, 402, or 500 after signing is not proof that funds stayed put.";
    steps = ["STOP: do not repeat the signed payment.", "Inspect your trusted wallet and the correct chain/token through a trusted explorer, including pending transactions.", "Preserve redacted HTTP status and order identifier; never share PAYMENT-SIGNATURE or wallet credentials.", "Ask the original merchant to reconcile the first attempt before doing anything else."];
  } else if (delivery === "valid_delivered") {
    status = "DELIVERY_WITHOUT_REPORTED_PAYMENT";
    explanation = "You report a usable response without signing, but that does not mean the service is free or prove a wallet was not charged in a different attempt.";
    steps = ["Confirm the exact request's quoted terms and your own wallet record.", "Do not send money merely to make a successful response 'more valid'.", "Contact the merchant if this was expected to be a paid order."];
  } else {
    status = "NO_SIGNATURE_REPORTED_CHAIN_NOT_CONFIRMED";
    explanation = "You report no payment signature and no confirmed on-chain event. This page cannot guarantee funds did not move or that a fresh quote is safe.";
    steps = ["Check your wallet records and the correct network first.", "Review any new quote, amount, recipient and resource with a trusted independent client before deciding yourself.", "This tool never signs, retries, transmits or buys a service."];
  }
  return Object.freeze({
    status,
    explanation,
    steps: Object.freeze(steps),
    txExplorerUrl: tx ? "https://basescan.org/tx/" + tx.toLowerCase() : null,
    evidenceOrigin: "SELF_REPORTED_ONLY",
    onchainSettlementIndependentlyVerified: false,
    merchantDeliveryIndependentlyVerified: false,
    wasPaymentSignedByThisTool: false,
    paymentRetryRecommended: false,
    fundsRecovered: false,
    networkRequests: 0,
    disclaimer: "Educational triage only. Confirm facts with your own wallet, the public chain and the merchant. No tax, legal, security or refund guarantee."
  });
}

export const demoPostPaymentFailure = Object.freeze({
  signed: "yes", onchain: "confirmed",
  delivery: "failed_or_invalid",
  publicBaseTxHash: "" // never fabricate a transaction as proof
});
