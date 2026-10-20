# Actual buyer-side unpaid x402 CSV API conformance — PaperPilot / VM5

This is a public, reproducible, fully UNSIGNED conformance check of the
existing one-owner production CSV API. It is NOT an independent buyer purchase,
user-wallet authorization, delivered paid report, onchain settlement
certificate, private merchant audit, or a money receipt.

**Observed 2026-10-20 17:14:17 UTC (2026-10-21 02:14 KST).** The original
merchant at https://vm5-openapi-x402.onrender.com/v1/csv-preflight
returned a valid HTTP402 exact-price challenge for completely fabricated
CSV rows with browser-compatible CORS. An independent owner-controlled
Chrome run on the first-party buying page had already shown its own
real "Price verified" screen. Neither run spent money or connected a wallet.

## Exactly two unpaid requests, no user files

Requires Node.js 22+ and an Internet connection. Running the source with the
explicit flag below uses ONLY its two fixed invented rows:

    node examples/verify-csv-x402-unpaid.mjs --live-unsigned-check

The source is https://github.com/livastic-vm1-primary/paperpilot-tools/blob/main/examples/verify-csv-x402-unpaid.mjs .
It sends an OPTIONS CORS preflight and ONE unsigned POST with precisely this
fixed, non-confidential input:

    id,amount
    SYNTHETIC_1,1.25
    SYNTHETIC_2,2.50

Merely importing this script sends ZERO requests. There is no argument to
specify actual customer CSVs, a wallet address, private keys, bearer tokens,
payment signatures or transaction data. The unsigned POST asks only for a
merchant quote. No auto-retries or redirects are supported.

## Concrete observed first-party result

Machine-readable source result:
https://livastic-vm1-primary.github.io/paperpilot-tools/docs/CSV_005_UNSIGNED_QUOTE_PROOF_20261021.json

| First-party observed invariant | Result |
| --- | --- |
| CORS OPTIONS | HTTP 204; actual GitHub Pages Origin allowed |
| CORS exposed headers | PAYMENT-REQUIRED and PAYMENT-RESPONSE |
| Invented CSV POST without authorization | HTTP 402; not a successful payment |
| Encoded PAYMENT-REQUIRED value | 2,560 bytes |
| x402 protocol | Version 2; exactly one accepted option |
| Network | Base eip155:8453 |
| Token | Official native Circle Base USDC: 0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913 |
| Price | 5,000 atomic = 0.005000 USDC |
| Existing public payTo | 0x6b01efA0705E91a7aca54271510bf9e594717f34 |
| Same exact published buyer page security validator | PASS |
| Independently verified real buyer-paid CSV POST | NO |
| EIP-3009/EIP-712 wallet signature created | NO |
| Paid CSV POST HTTP 200 and delivered result | NOT VERIFIED |
| External canonical Base token settlement / new income | NOT VERIFIED / 0 USDC |

The script REUSES the actual published buyer checkout guard located in the
existing src/csv-x402-guard.mjs. It never copies the merchant price, token,
network or recipient from an unchecked URL into something that can sign.
Its 19 offline mock regression tests fail closed on changed amount,
receiver, token, chain, service URL, version, payment scheme, timeout,
a missing challenge, multiple offers, missing CORS, and server 200/400.

The exact existing POST-only paid product has already been registered ONCE
by the original VM5 merchant at the 402Index public listing:
https://402index.io/api/v1/services/108d3905-cfe9-4db6-ac05-c5af111b830c .
Registration or marketplace discovery is NOT a verified buyer purchase,
successful delivery, facilitator receipt or onchain transfer.

## Real buying requires independent informed consent

The FREE local CSV inspection happens in the visitor's own browser.
**Privacy update after the original 02:14 KST measurement:** the current buyer UI now obtains its free quote using ONLY fixed fictional CSV data from the same publicly inspected script. No visitor CSV is uploaded before wallet payment authorization. The original earlier beta displayed a consented preview that sent real visitor-selected CSV; this historical report documents the original merchant protocol, not the outdated buyer upload behavior. Do not submit sensitive invoices, employee/customer PII or credentials on any paid request.

The separate published browser-wallet checkout
https://livastic-vm1-primary.github.io/paperpilot-tools/csv-usdc-checkout.html
requires the correct Base wallet, a fresh fixed price, a SECOND explicit
authorization checkbox and review of ONE EIP-3009 typed-data signature.
It will not automatically retry after a potentially ambiguous settlement.
This proof does not test that signed paid-POST flow with a real purchaser.
Merely connecting a wallet is not revenue or payment.

No independent buyer-owned CSV POST was verified paid as of the timestamp
above. Earlier real small third-party purchases of DIFFERENT owner VM5
GET endpoints are already included once in the owner's historical gross
USDC ledger. They are not this merchant CSV POST's first buyer.

Successful CORS/HTTP402 does NOT certify vendor compliance, user privacy,
buyer wallet custody, the availability of paid results, or finality. No
automatic tax/bookkeeping decision or security audit claim is made.
