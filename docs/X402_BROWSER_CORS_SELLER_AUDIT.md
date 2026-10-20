# x402 seller CORS preflight — free, reproducible browser-readiness check

A real payment integration problem: getting an unsigned HTTP 402 quote is not enough to show that browsers can read that price and send a buyer-authorized payment. The CORS preflight must permit the actual request method and headers used by the browser client.

**This is original AI-assisted source for one human economic owner. This document and free tests do not certify any merchant, sign or spend USDC, confirm wallet payment, promise an audit contract or make a claim of new customers.**

## Run your own free diagnostic

Inspect **only a public endpoint you own or are explicitly allowed to test**, with a fake data set. Do not run HEAD or signed payment probes for this check. We make NO remote request inside the JavaScript script.

Execute an unsigned, one-time OPTIONS request to YOUR allowed x402 endpoint from your own computer, then feed only the public response headers into the offline Node checker:

~~~sh
curl --max-time 12 --max-redirs 0 -sS -i \
  -X OPTIONS 'https://YOUR-OWN-SERVER.example/your-paid-route' \
  -H 'Origin: https://YOUR-BUYER-UI.example' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,payment-signature' \
  > public-options-headers.txt

node tools/x402-browser-cors-preflight.mjs \
  --origin https://YOUR-BUYER-UI.example \
  --method POST \
  --headers content-type,payment-signature \
  < public-options-headers.txt
~~~

The standalone script uses only built-in Node.js, reads the supplied HTTP response headers from stdin, rejects suspicious pasted signatures or credentials, and emits JSON. It checks the status, Allow-Origin, Allow-Methods, and Allow-Headers. It additionally warns if the OPTIONS response does not advertise Expose-Headers, but that alone does not prove what headers an actual unpaid 402 or a paid 200 exposes. This is a **diagnostic hint, not a full browser or settlement check**.

A typical successful original owner-owned response (captured on October20) had HTTP204, Allow-Origin *, Allow-Methods GET,POST,OPTIONS and Allow-Headers Content-Type,PAYMENT-SIGNATURE,PAYMENT-RESPONSE.

## Why an extra SDK header changes whether a browser will pay

Browser CORS uses the **request** header names in Access-Control-Request-Headers. Some generic paid-request wrappers add Access-Control-Expose-Headers to the **request** even though that name normally configures what a response exposes. Our original VM5 API does NOT include Access-Control-Expose-Headers in its allowed **request** headers. With that extra header, a browser would reject the preflight. With only content-type and payment-signature, the original VM5 OPTIONS response does allow it.

The released upstream SDK wrapper in @x402/fetch version 2.28.0 adds Access-Control-Expose-Headers to its automatic retry. This problem is independently analyzed here: https://llm4agents.com/blog/x402-browser-cors-preflight-head-header-size-audit .

The CURRENT original PaperPilot browser CSV checkout does **not** use that wrapper. It uses x402HTTPClient to create a single payment payload, checks that its only protocol header is PAYMENT-SIGNATURE, then would send ONE buyer-authorized POST with Content-Type and Accept. An unsigned quote request in our browser actually worked. No real customer wallet signed a payment here, and no independently settled CSV POST purchase has been proven.

## What the free diagnostic cannot verify

- The actual browser UI, including all redirects and dynamically chosen request headers.
- Whether an actual HTTP402 exposes PAYMENT-REQUIRED or paid HTTP200 exposes PAYMENT-RESPONSE.
- Whether a recipient actually controls an address or the chain/token is safe.
- EIP-712 signature correctness, replay behavior, transaction finality or refund rights.
- Whether a merchant actually fulfills the requested work or any customer paid.
- Privacy, CSP, mixed content, private networks or contract security beyond the headers shown.

A 204 response is NOT payment success. This utility refuses pasted private credentials and signs absolutely nothing. Only use one legitimate merchant URL with permission.

## Optional paid scoped report — US$49 / native Base USDC 49 indicative

PaperPilot Tools may provide a **one-merchant-path, one-buyer-Origin browser x402 compatibility QA pilot** after an independent real purchaser accepts a written scope and lawful payee terms. Quoted pilot amount is **49 native Circle USDC on Base (eip155:8453)**, indicative and subject to explicit buyer agreement. No on-site checkout, escrow, automatic invoice or transfer is created here. Never send USDC without a written agreement and confirmed payment destination.

A limited diagnostic report covers: unsigned real HTTP402 price/asset/recipient structure, two **non-destructive OPTIONS** header configurations, whether public response CORS exposes required payment headers, the exact pass/fail matrix with curl reproduction, and prioritized merchant-owned remediation suggestions. Deliverable: concise Markdown report plus sanitized JSON. No production fix, wallet signing, private user information, comprehensive penetration test, forced purchase, smart-contract audit, or guaranteed commercial result is included.

One-owner commercial inquiry: https://livastic-vm1-primary.github.io/paperpilot-tools/contact.html?service=x402-cors

Official x402 HTTP v2 transport source: https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md

Original readable quote preview: https://livastic-vm1-primary.github.io/paperpilot-tools/x402-inspector.html

Existing separately buyer-paid VM5 API terms: https://vm5-openapi-x402.onrender.com/v1/docs


## Buyer-reported invoice amount mismatch: optional bounded QA check

A genuine independent [Bitrefill developer issue](https://github.com/bitrefill/agents/issues/11)
reported an x402 merchant invoice priced around **0.10 native Base USDC**
returning a **1,000 USDC HTTP 402 placeholder**, while an alternate
Lightning acceptance option declared `issuanceDenied: invoice_not_found`.
This is evidence of a *problem to debug*, **not** evidence the reporter
commissioned or endorsed our work. We will not submit a signed request,
create a real invoice or spend someone's funds to reproduce it.

The original free [x402 quote inspector](../x402-inspector.html) now has
an **optional expected invoice USDC amount**. It uses integer micro-USDC
comparison and shows **STOP** for a mismatched Base USDC amount *regardless*
of an unrelated large display-cap, and if **any** option reports an issuance
denial. The one-click fictional sample (expected 0.10, quote 1,000, Lightning
invoice_not_found) is safe to test locally without contacting a merchant.

For a **separately agreed 49-native-Base-USDC merchant QA pilot**, a client
could ask us to include, in the existing ONE allowed route and ONE Origin:

1. One **fictitious or explicitly authorized non-sensitive** expected
   invoice amount and one **unsigned** public 402 challenge; highlight
   inconsistent 6-decimal token amounts and any untrusted vendor denial.
2. The existing two safe read-only browser OPTIONS/CORS preflight header
   scenarios for the *same* agreed origin and route.
3. Deliver a brief Markdown/JSON discrepancy & CORS matrix, exact synthetic
   fixture and actionable merchant-side remediation suggestions; the client
   independently verifies and deploys any fixes.

This is **not** a promise to call an authenticated private invoice, debug
billing servers, request real crypto purchases, sign transactions, install
wallet software, rewrite merchant code, conduct security testing, or perform
onchain settlement audits. Client must accept a distinct written scope,
AI tooling/data/IP permissions, return/refund policy and lawful real-world
payee before a paid contract or data transfer. No clients have purchased
this particular audit yet; the published issue and demo do not represent
a contracted deliverable or genuine payment.
