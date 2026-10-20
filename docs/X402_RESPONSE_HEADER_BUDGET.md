# x402 v2 PAYMENT-REQUIRED transport-size preflight (free, local)

Background: [x402-foundation/x402 issue #3803](https://github.com/x402-foundation/x402/issues/3803) documents actual reports of large public PAYMENT-REQUIRED response headers exceeding common client parser limits. The upstream [HTTP transport spec](https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md) encodes PaymentRequired as a Base64 response header. HTTP header limits are implementation/configuration-specific, not one universal x402 value. The [Cloudflare batch settlement spec](https://github.com/x402-foundation/x402/blob/main/specs/schemes/batch-settlement/scheme_batch_settlement_cloudflare.md) explicitly notes that some intermediaries reject at 2 KB.

## Actual released tool

Public free preview: https://livastic-vm1-primary.github.io/paperpilot-tools/x402-inspector.html

- Paste only a **public, unsigned** PAYMENT-REQUIRED Base64 header or its JSON object. Never paste PAYMENT-SIGNATURE, API keys, wallet signatures, user credentials or client invoices.
- A Base64 header: report the actual observed Base64 field's length. Decoded JSON: report the size of one *potential compact JSON serialization*, not a claim about the deployed header.
- Display an HTTP/1 field-line byte estimate including the literal name, separator and CRLF. Checkpoints: 2,048 bytes (review), 8,192 bytes (elevated compatibility risk), 16,384 bytes (severe compatibility risk); these are **diagnostic heuristics**, not definitive limits. Total HTTP headers, proxies, HTTP/2 framing, different serialization and server policies are unmeasured.
- No remote fetch, payment, wallet, token signature, approval, settlement or on-chain verification. A green reading does not guarantee that the application works. The original existing amount mismatch and merchant-declared denial detection remain independent.
- A safe engineering response when a header becomes too large is to *review and minimize optional metadata and avoid embedding huge Bazaar examples or schemas in the challenge*. Do not truncate a live signed offer or silently change what a paying client authorized.
- The page now simulates the effect of **removing one optional Bazaar metadata field at a time**, then ranks the six greatest potential encoded-byte reductions. It never modifies the original quote, prints raw examples, removes payment-critical fields, or recommends deleting a field without manual semantics review. Simulated byte savings are independent and **cannot be added**; a real response/proxy may serialize differently.
- Tests compare observed-vs-estimated lengths, 2/8/16 KiB checkpoints, synthetic large Bazaar samples, price integrity, field omission simulations, 32 KiB input cap and privacy assurances. [Fictional public sample report](./X402_HEADER_BUDGET_FICTIONAL_SAMPLE.json) is not a client audit.

## Optional paid follow-on

**Distinct small, actually listed service:** [One public unsigned 402 header — tailored private 9 Base native Circle USDC report on Clawlancer](https://clawlancer.ai/marketplace/e072b639-4235-428f-89ad-966c0682dbf9) is an active FIXED seller listing, verified using its public API on 2026-10-20. The paid deliverable is a human-owner-authorized, AI-assisted written compatibility/remediation report using an approved **nonconfidential** header, within its stated terms. The free browser analysis remains free. No seller sale, actual escrow release, fiat withdrawal, or payout has been verified. It is not a substitute for accepting merchant/third-party terms. Never share wallet seeds, secrets, signed payment headers or private customer data.


The already-existing manually quoted [49-native-Base-USDC merchant QA offer](https://livastic-vm1-primary.github.io/paperpilot-tools/services.html#x402-audit) covers only one mutually approved HTTPS route and one browser origin, unsigned 402/OPTIONS checks and a short written compatibility report. Header-size analysis can be *proposed* in that same fixed scope if agreed **before** any execution. It is not an automatic checkout, customer contract, or a claim anyone purchased it. Buyer must confirm technical authorization, exact scope, lawful payment and return terms. No real purchase or revenue is inferred from this document.
