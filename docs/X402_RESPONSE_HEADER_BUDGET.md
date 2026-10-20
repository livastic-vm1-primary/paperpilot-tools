# x402 v2 PAYMENT-REQUIRED transport-size preflight (free, local)

Background: [x402-foundation/x402 issue #3803](https://github.com/x402-foundation/x402/issues/3803) documents actual reports of large public PAYMENT-REQUIRED response headers exceeding common client parser limits. The upstream [HTTP transport spec](https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md) encodes PaymentRequired as a Base64 response header. HTTP header limits are implementation/configuration-specific, not one universal x402 value. The [Cloudflare batch settlement spec](https://github.com/x402-foundation/x402/blob/main/specs/schemes/batch-settlement/scheme_batch_settlement_cloudflare.md) explicitly notes that some intermediaries reject at 2 KB.

## Actual released tool

Public free preview: https://livastic-vm1-primary.github.io/paperpilot-tools/x402-inspector.html

- Paste only a **public, unsigned** PAYMENT-REQUIRED Base64 header or its JSON object. Never paste PAYMENT-SIGNATURE, API keys, wallet signatures, user credentials or client invoices.
- A Base64 header: report the actual observed Base64 field's length. Decoded JSON: report the size of one *potential compact JSON serialization*, not a claim about the deployed header.
- Display an HTTP/1 field-line byte estimate including the literal name, separator and CRLF. Checkpoints: 2,048 bytes (review), 8,192 bytes (elevated compatibility risk), 16,384 bytes (severe compatibility risk); these are **diagnostic heuristics**, not definitive limits. Total HTTP headers, proxies, HTTP/2 framing, different serialization and server policies are unmeasured.
- No remote fetch, payment, wallet, token signature, approval, settlement or on-chain verification. A green reading does not guarantee that the application works. The original existing amount mismatch and merchant-declared denial detection remain independent.
- A safe engineering response when a header becomes too large is to *review and minimize optional metadata and avoid embedding huge Bazaar examples or schemas in the challenge*. Do not truncate a live signed offer or silently change what a paying client authorized.
- Tests compare observed-vs-estimated lengths, 2/8/16 KiB checkpoints, 32 KiB input cap and privacy assurances on deterministic fictional fixtures.

## Optional paid follow-on

The already-existing manually quoted [49-native-Base-USDC merchant QA offer](https://livastic-vm1-primary.github.io/paperpilot-tools/services.html#x402-audit) covers only one mutually approved HTTPS route and one browser origin, unsigned 402/OPTIONS checks and a short written compatibility report. Header-size analysis can be *proposed* in that same fixed scope if agreed **before** any execution. It is not an automatic checkout, customer contract, or a claim anyone purchased it. Buyer must confirm technical authorization, exact scope, lawful payment and return terms. No real purchase or revenue is inferred from this document.
