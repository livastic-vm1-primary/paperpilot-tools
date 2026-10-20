# Buyer-data privacy improvement: price quotes never upload your CSV

**Current original buyer beta, separate from historic v0.1.0 UI.**
The existing PaperPilot checkout at
https://livastic-vm1-primary.github.io/paperpilot-tools/csv-usdc-checkout.html
offers an always-free local CSV structural check, an optional PUBLIC price
quote and a separately opt-in buyer-paid 0.005 native Circle Base USDC
hosted preflight. This privacy improvement changes ONLY its browser frontend;
it does not modify VM5's price, beneficiary wallet, chain, live paid server
or any buyer wallet.

## The verified problem with the older beta

The earlier VM1 beta let the visitor consent to upload the actual selected
CSV while requesting the *unpaid* price. Although disclosed, doing that
was unnecessary because the merchant's price is a fixed 0.005 Base USDC
per one CSV POST. It creates avoidable data exposure before users decide
to buy. The earlier published v0.1.0 release notes are a historic description,
not the current frontend.

## The current three-phase customer contract

**1. Free local check:** the browser analyzes the visitor's selected
non-confidential CSV without any network request or wallet.

**2. Free price inquiry:** the buyer can press the published Get live price
button even with NO wallet, NO upload consent and NO visitor CSV selected.
Only the public fictional source-owned text below is sent. No real input,
local file, address, token, signature, tax record, or buyer-specific
information is included in this free request:

    id,amount
    SYNTHETIC_1,1.25
    SYNTHETIC_2,2.50

The browser verifies the actual original merchant's challenge using the
same strict x402 v2 guard as the paid checkout. Unexpected price, token,
recipient, chain, service URL, options count, timeout or signature scheme
causes a refusal. The browser does not auto-connect MetaMask or pay.

**3. Optional actual paid report:** only after the visitor independently
provides a legitimate non-sensitive CSV, checks the SOURCE-UPLOAD consent,
has an authorized connected Base wallet, verifies the exact fresh 0.005
CircleUSDC offer and checks separate ONE-PAYMENT consent, the browser
requests a reviewed typed-data signature and attempts ONE paid CSV POST.
Its selected actual CSV content is transmitted only on that paid POST
after the buyer's signing step. No third-party private file belongs in
a test, source repository, chat, GitHub issue or email.

If a CSV check, wallet readiness or unsigned quote fails **before signing**,
the page does not lock the payment button permanently and can show a
corrected unsigned price later. Once EIP-712 signing begins, an ambiguous
result cannot be retried on the same page. The buyer should reconcile
their wallet and actual merchant receipt outside the page before deciding
any further action. Actual response delivery and canonical Base settlement
must still be independently confirmed; this frontend does not guarantee
finality, a customer, a bank payout or income.

## Actual independent test evidence and limits

The existing VM5 production merchant at
https://vm5-openapi-x402.onrender.com/v1/csv-preflight
returned real unsigned HTTP402 challenge headers for TWO DIFFERENT
original wholly fictional CSV bodies, both with identical exact
**0.005 native Circle Base USDC** terms, official Circle contract, chain
eip155:8453, checksum-preserving original recipient and x402 v2 resource.
The headers were 2,560 encoded bytes in both responses. Those first-party
results support requesting a fixed price from the known fictional text
without transmitting actual visitor source rows.

Original Node mocked/structural regression tests reject source-data leaks in
either unpaid quote or free CLI and reject unexpected token/chain/price
changes; we compile and publish the actual browser ESM bundle, not only
source tests. In a real browser, an outside user should be able to obtain
and review an unpaid price WITHOUT checking the upload checkbox. Actual
buyer-funded EIP-712 signing, paid POST HTTP200, delivered CSV results and
finalized independently attributable outside Base USDC receipts remain
**UNVERIFIED** as of this document. The product is a beta.

A free HTTP402 response does not prove user trust, demand, compliant
personal-data processing, customer support, transaction finality,
facilitator reliability, availability or merchant revenue. Do not publish
real personal wallet histories or financial CSVs in a public forum.

The existing original VM5 paid GET resources' older external sales
remain the same one-owner historical four finalized native Circle Base
USDC receipt events totaling 1.020000 USDC **GROSS counted once**,
not newly created from this privacy improvement.
