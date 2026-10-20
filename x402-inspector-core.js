/* Copyright (c) 2026 PaperPilot Tools. MIT source use.
 * Offline, pure, public x402 v2 quote *display* only.
 * No remote HTTP, wallet access, signature assembly, verification or telemetry.
 */
(function (global) {
  "use strict";
  const NETWORK = "eip155:8453";
  const NATIVE_BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  const MAX_BYTES = 32768;
  const MAX_ACCEPTS = 20;
  const WALLET = /^0x[a-fA-F0-9]{40}$/;
  const atomicAmount = /^\d{1,32}$/;
  const TEST_FIXTURE = Object.freeze({
    x402Version: 2,
    resource: {url: "https://example.invalid/synthetic", description: "FICTIONAL data, do NOT pay", mimeType: "application/json"},
    accepts: [{scheme: "exact", network: NETWORK, amount: "10000", asset: NATIVE_BASE_USDC, payTo: "0x1111111111111111111111111111111111111111"}],
  });

  const INVOICE_MISMATCH_FIXTURE = Object.freeze({
    x402Version: 2,
    resource: {url: "https://example.invalid/fictional-broken-invoice", description: "FAKE 0.10 USDC invoice; do not pay", mimeType: "application/json"},
    accepts: [
      {scheme: "exact", network: NETWORK, amount: "1000000000", asset: NATIVE_BASE_USDC, payTo: "0x1111111111111111111111111111111111111111"},
      {scheme: "exact", network: "lightning:mainnet", amount: "1", asset: "lnbtc", payTo: "fake", extra: {issuanceDenied: "invoice_not_found"}}
    ],
  });

  function str(value, maxLength = 256) {
    return typeof value === "string" ? value.slice(0, maxLength) : "";
  }
  function parseMicroAmount(value) {
    if (typeof value !== "string" || !atomicAmount.test(value)) return null;
    const raw = BigInt(value);
    if (raw <= 0n) return null;
    return raw;
  }
  function formatMicro(amount) {
    if (typeof amount !== "bigint") return null;
    const units = amount / 1000000n;
    const fraction = (amount % 1000000n).toString().padStart(6, "0");
    return units.toString() + "." + fraction;
  }
  function parseCap(value) {
    const v = String(value).trim();
    if (!/^\d{1,5}(?:\.\d{1,6})?$/.test(v)) {
      throw new Error("Enter a valid USDC budget with up to six decimal places.");
    }
    const [major, sub = ""] = v.split(".");
    const amount = BigInt(major) * 1000000n + BigInt((sub + "000000").slice(0, 6));
    if (amount > 10000000000n) throw new Error("Budget limit is 10,000 USDC.");
    return amount;
  }
  function parseExpectedInvoiceAmount(value) {
    const trimmed = String(value ?? "").trim();
    if (trimmed === "") return null;
    try {
      const atomic = parseCap(trimmed);
      if (atomic <= 0n) throw Error("zero");
      return atomic;
    } catch {
      throw new Error("Expected invoice amount must be positive USDC, up to six decimal places, with a maximum of 10,000 USDC.");
    }
  }

  function parseInput(raw) {
    if (typeof raw !== "string") throw new Error("Paste a public PAYMENT-REQUIRED header or x402 v2 JSON.");
    if (new TextEncoder().encode(raw).length > MAX_BYTES) {
      throw new Error("Input exceeds the 32 KiB local-only limit.");
    }
    const text = raw.trim();
    if (!text) throw new Error("No public 402 quote was provided.");
    // A mistaken paste of a signed credential is not a merchant quote.
    if (/^\s*(?:PAYMENT-SIGNATURE|X-PAYMENT|AUTHORIZATION)\s*:/im.test(text)) {
      throw new Error("This appears to contain private signed payment or authorization data. Do not paste it.");
    }
    if (text.startsWith("{")) {
      const obj = JSON.parse(text);
      if (!obj || Array.isArray(obj) || typeof obj !== "object") throw new Error("Expected a JSON object.");
      return obj;
    }
    let encoded = text;
    if (/^PAYMENT-REQUIRED\s*:/i.test(text)) {
      encoded = text.replace(/^PAYMENT-REQUIRED\s*:\s*/i, "").trim();
    } else if (text.includes("\n") || /^HTTP\//i.test(text)) {
      const matches = [...text.matchAll(/^PAYMENT-REQUIRED\s*:\s*([A-Za-z0-9+/=_-]+)\s*$/gim)];
      if (matches.length !== 1) throw new Error("Paste only one public PAYMENT-REQUIRED header; never a signed request.");
      encoded = matches[0][1];
    }
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(encoded) || encoded.length > MAX_BYTES || encoded.length % 4 === 1) {
      throw new Error("PAYMENT-REQUIRED must contain valid Base64-encoded JSON.");
    }
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    let decoded;
    try {
      const chars = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
      const bytes = Uint8Array.from(chars, c => c.charCodeAt(0));
      decoded = new TextDecoder("utf-8", {fatal:true}).decode(bytes);
    } catch {
      throw new Error("Invalid Base64 or UTF-8 data; nothing was submitted.");
    }
    const obj = JSON.parse(decoded);
    if (!obj || Array.isArray(obj) || typeof obj !== "object") throw new Error("The decoded quote must be an object.");
    return obj;
  }

  // A header-size *compatibility warning*, not a universal HTTP or x402 cap.
  // When given an actual unsigned PAYMENT-REQUIRED header, count its Base64
  // bytes. When given JSON, count a prospective compact JSON->Base64 encoding.
  // Other HTTP headers and intermediary settings are unknown, so passing one
  // threshold never certifies payment transport compatibility.
  function inspectTransportHeader(raw, quote) {
    const text = raw.trim();
    const matches = text.matchAll(/^PAYMENT-REQUIRED\s*:\s*([A-Za-z0-9+/_-]+={0,2})\s*$/gim);
    const lines = [...matches];
    const bare = /^[A-Za-z0-9+/_-]+={0,2}$/.test(text) ? text : null;
    const suppliedValue = lines.length === 1 ? lines[0][1] : bare;
    const source = suppliedValue === null ? "compact-json-estimate" : "observed-public-header";
    const encodedValueBytes = suppliedValue === null
      ? Math.ceil(new TextEncoder().encode(JSON.stringify(quote)).length / 3) * 4
      : new TextEncoder().encode(suppliedValue).length;
    const headerLineBytes = encodedValueBytes + new TextEncoder().encode("PAYMENT-REQUIRED: \r\n").length;
    const risk = headerLineBytes >= 16384 ? "SEVERE_16K_PLUS" :
      headerLineBytes >= 8192 ? "HIGH_8K_PLUS" :
      headerLineBytes >= 2048 ? "REVIEW_2K_PLUS" : "BELOW_2K_NOT_CERTIFIED";
    return {
      method: source, paymentRequiredValueBytes: encodedValueBytes,
      estimatedHttp1HeaderLineBytes: headerLineBytes, risk,
      exceeds2KiB: headerLineBytes >= 2048,
      exceeds8KiB: headerLineBytes >= 8192,
      exceeds16KiB: headerLineBytes >= 16384,
      totalOtherResponseHeadersIncluded: false,
      compatibilityGuaranteed: false,
      note: "Only a local Base64 header-length inspection. HTTP/2 framing, other headers, per-field/per-line/total-header limits, proxy rules and server serialization are not verified. Do not truncate or rewrite an x402 signed offer."
    };
  }

  function analyze(raw, capInput = "0.02", expectedInvoiceUSDCInput = "") {
    const quote = parseInput(raw);
    const transportHeaderBudget = inspectTransportHeader(raw, quote);
    const maxMicro = parseCap(capInput);
    const expectedInvoiceMicro = parseExpectedInvoiceAmount(expectedInvoiceUSDCInput);
    if (quote.x402Version !== 2) throw new Error("Only x402 version 2 public payment requirements are supported.");
    if (!Array.isArray(quote.accepts) || quote.accepts.length < 1 || quote.accepts.length > MAX_ACCEPTS) {
      throw new Error("Expected 1–20 explicit payment acceptance options.");
    }
    const resource = quote.resource && typeof quote.resource === "object" && !Array.isArray(quote.resource)
      ? quote.resource : {};
    const resourceUrl = str(resource.url, 1200);
    const notices = [];
    if (transportHeaderBudget.exceeds8KiB) {
      notices.push("HTTP header transport risk: this PAYMENT-REQUIRED field alone is at least 8 KiB; some clients or proxies reject large individual fields before payment can start.");
    } else if (transportHeaderBudget.exceeds2KiB) {
      notices.push("HTTP header transport review: the field exceeds 2 KiB; deployment limits vary, and other response headers are not included.");
    }

    // x402 v2 PaymentRequired.error is a vendor-supplied message, not
    // settlement proof or a facilitator-authenticated error. Display
    // bounded text only; never paste PAYMENT-SIGNATURE or auto-retry.
    const serverError = typeof quote.error === "string"
      ? quote.error.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240)
      : "";
    if (quote.error != null && typeof quote.error !== "string") {
      notices.push("Unrecognized non-string merchant error field; no failure reason was inferred.");
    }
    if (serverError) {
      notices.push("This text is only the merchant-reported error, not settlement or identity verification. Do not auto-retry a signed payment; check your own wallet and independent chain receipt first.");
    }
    // Real-world fail-closed pattern: an invoice lookup failure must not be
    // treated as a valid payment invitation, even when a placeholder HTTP402
    // accidentally advertises a valid-looking, much larger Base USDC price.
    // Check ALL advertised options: denial metadata may be attached to a
    // non-Base (e.g. Lightning) alternative, while Base lists the high price.
    const merchantIssuanceDenied =
      /invoice_not_found|issuance.?denied|invoice_unpayable/i.test(serverError) ||
      quote.accepts.some(option => {
        if (!option || typeof option !== "object" || Array.isArray(option)) return false;
        const extra = option.extra;
        if (!extra || typeof extra !== "object" || Array.isArray(extra)) return false;
        const value = extra.issuanceDenied;
        return typeof value === "string" && value.trim().length > 0 &&
          !/^(?:false|none|0)$/i.test(value.trim());
      });
    if (merchantIssuanceDenied) notices.push("STOP: the merchant's untrusted quote advertises an invoice issuance denial; refuse signing and confirm invoice validity with the merchant before any retry.");
    if (resourceUrl && !/^https:\/\//i.test(resourceUrl)) notices.push("Resource URL is not HTTPS.");
    if (quote.accepts.length > 1) notices.push("Multiple possible payment options exist; inspect the option selected by your real client.");

    const choices = quote.accepts.map((option, i) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        throw new Error("Each accepts entry must be an object.");
      }
      const network = str(option.network, 80);
      const asset = str(option.asset, 84);
      const payTo = str(option.payTo, 84);
      const scheme = str(option.scheme, 60);
      const amount = parseMicroAmount(option.amount);
      const isBase = network === NETWORK;
      const nativeUSDC = isBase && asset.toLowerCase() === NATIVE_BASE_USDC;
      const addressFormat = WALLET.test(payTo);
      const amountUSDC = nativeUSDC && amount !== null ? formatMicro(amount) : null;
      const budgetExceeded = nativeUSDC && amount !== null && amount > maxMicro;
      const expectedAmountMismatch = expectedInvoiceMicro !== null && nativeUSDC &&
        (amount === null || amount !== expectedInvoiceMicro);
      const warnings = [];
      if (scheme !== "exact") warnings.push("Unsupported payment scheme; do not assume it is an exact-charge request.");
      if (!isBase) warnings.push("Not Base mainnet (eip155:8453). Chain and token must be verified independently.");
      if (isBase && !nativeUSDC) warnings.push("This is not native Circle USDC on Base. A token label alone is not proof.");
      if (amount === null) warnings.push("Missing or invalid positive integer atomic amount.");
      if (!addressFormat) warnings.push("Recipient payTo address is not a 20-byte EVM hexadecimal address.");
      if (budgetExceeded) warnings.push("Quoted native Base USDC exceeds the chosen display-only spending limit.");
      if (expectedAmountMismatch) warnings.push("STOP: quoted Base USDC does not equal the user's expected invoice amount. Do not sign or pay.");
      if (expectedInvoiceMicro !== null && !nativeUSDC) warnings.push("Cannot compare expected native Base USDC invoice amount against this other network or token.");
      if (!budgetExceeded && nativeUSDC && amount !== null) {
        warnings.push("Quote is within your chosen display limit, but no merchant identity or payment authorization is verified.");
      }
      return {
        index: i + 1, scheme, network, asset, payTo, amountAtomic: typeof option.amount === "string" ? option.amount.slice(0, 40) : "",
        amountUSDC, nativeBaseUSDC: nativeUSDC, recipientFormatValid: addressFormat,
        overBudget: !!budgetExceeded, expectedInvoiceAmountMismatch: !!expectedAmountMismatch, issues: warnings,
      };
    });
    const baseChoices = choices.filter(option => option.nativeBaseUSDC);
    const mismatches = baseChoices.filter(option => option.expectedInvoiceAmountMismatch);
    const matches = expectedInvoiceMicro === null ? [] :
      baseChoices.filter(option => option.amountUSDC === formatMicro(expectedInvoiceMicro));
    const decision = merchantIssuanceDenied ? "STOP_MERCHANT_INVOICE_DENIED" :
      expectedInvoiceMicro === null ? "NO_AMOUNT_COMPARISON_REQUESTED" :
      !baseChoices.length ? "REVIEW_NO_NATIVE_BASE_USDC_OPTION" :
      mismatches.length ? "STOP_QUOTED_AMOUNT_DIFFERS_FROM_INVOICE" :
      matches.length === baseChoices.length ? "AMOUNT_MATCH_ONLY_NOT_PAYMENT_AUTHORIZATION" :
      "STOP_INDETERMINATE_PAYMENT_AMOUNT";
    const decisionExplanation = decision.startsWith("STOP") ?
      "Refuse signing and contact the merchant. An HTTP 402 is not a payable invoice or a wallet spending authorization." :
      decision === "AMOUNT_MATCH_ONLY_NOT_PAYMENT_AUTHORIZATION" ?
      "The quoted Base native USDC amount matches your supplied expectation; seller identity, invoice validity and wallet payment safety are STILL NOT VERIFIED." :
      "No exact native Base USDC invoice comparison was established; do not infer that this quote is payable.";

    return {
      kind: "public-x402-quote-offline-structural-display-v1",
      version: 2, networkExpected: NETWORK, canonicalNativeBaseUSDC: NATIVE_BASE_USDC,
      resource: {url: resourceUrl, description: str(resource.description, 300)},
      transportHeaderBudget,
      merchantReportedError: serverError,
      merchantErrorUnverified: true,
      maxDisplayBudgetUSDC: formatMicro(maxMicro),
      invoiceComparison: {
        expectedInvoiceUSDC: expectedInvoiceMicro===null ? null : formatMicro(expectedInvoiceMicro),
        state: decision,
        explanation: decisionExplanation,
        merchantIssuanceDeniedUnverified: merchantIssuanceDenied,
        matchingBaseOptions: matches.length,
        mismatchedBaseOptions: mismatches.length,
      },
      options: choices,
      notices,
      completedOffline: true,
      networkRequests: 0,
      walletInteraction: false,
      chargedUSDC: "0",
      merchantIdentityVerified: false,
      onchainSettlementVerified: false,
      caveat: "This is untrusted unsigned quote text. Parsing it does not validate vendor identity, transaction, signatures, asset authenticity or safe spending. Do not submit signed payloads.",
    };
  }

  const exported = {analyze, inspectTransportHeader, parseInput, parseCap, parseExpectedInvoiceAmount, formatMicro, TEST_FIXTURE, INVOICE_MISMATCH_FIXTURE, NETWORK, NATIVE_BASE_USDC, MAX_BYTES};
  if (typeof module !== "undefined" && module.exports) module.exports = exported;
  if (global) global.PaperPilotX402 = exported;
})(typeof window !== "undefined" ? window : undefined);
