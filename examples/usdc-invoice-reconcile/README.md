# VM1 original USDC invoice ↔ declared transfer matching pilot (local-only)

This is a **synthetic-first code and protocol demonstration**, NOT real crypto
income, an audit report, a financial API integration or a completed purchase.
VM1/2/3/5 work for ONE human beneficial owner. VM5 alone owns independent
customer prospect discovery, deduplicated outreach and qualification.

Actual client feedback / agreed paid pilots / incremental native Base USDC:
**0/0/0** when created. USD 49 is ONLY the hypothesized bounded 50-receipt
manual-pilot price; not an accepted quote, subscription or payout.

## Minimal data contract (CSV, 256 KiB each / 750 records)

Invoice headers in exact spelling:

    invoice_id,amount_usdc,chain_id,token_contract,pay_to

Incoming ERC-20 Transfer *claims* with an explicit merchant-established invoice
reference (NOT intrinsic to blockchain transaction logs):

    tx_hash,log_index,invoice_id,amount_usdc,chain_id,token_contract,from_address,to_address

The expected chain is eip155:8453 or 8453 and the contract is original native
Circle USDC 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913. Comparison is
case-insensitive for token/address/hash; invoice_id is case-sensitive. Zero-address recipients, zero-from mints, and from==to
self-transfers fail closed for customer-payment attribution. Token
amounts use 6-decimal integer arithmetic using BigInt. Duplicate IDs in
invoice CSV quarantine the candidate and are **never silently overwritten**.
A duplicate (claimed chain, tx_hash, log_index) quarantines BOTH rows; identical
hashes with DIFFERENT log_index represent different potential events.

All 3 fixtures under fixtures/ are **fabricated**; no real payer address, invoice,
customer, bank account or txn is supplied. Browser CSV content is not uploaded.
Console demonstration:

    node --input-type=module -e "import {fictionalInvoices,fictionalTransfers,reconcileUsdcCsv} from './usdc-invoice-reconcile-core.mjs'; console.log(reconcileUsdcCsv(fictionalInvoices,fictionalTransfers).invoice_status_counts)"
    node --test tests/usdc-invoice-reconcile.test.mjs

Browser: https://livastic-vm1-primary.github.io/paperpilot-tools/usdc-invoice-reconcile.html

## Interpret the statuses, including limitations

Every status starting "candidate_" means **agreement within the supplied CSV
texts only**. Nothing checks actual Ethereum RPC data, finality, event
uniqueness across private datasets, canonical chain origin, right invoice
recipient, or business/legal agreement. The report intentionally removes
the original invoice IDs, hashes, and wallet addresses, but local numerical
amounts and row numbers may still be commercially sensitive.

- candidate_exact_amount_only: total of valid associated claimed transfer
  amounts equals invoice due; it is *NOT* independently paid.
- candidate_partial_underpaid / candidate_overpaid_review: arithmetic
  difference requiring actual ledger and payer verification before action.
- review_required_exception: invoice references one or more quarantined
  transfer rows (e.g. duplicate event, declared wrong network/token/to),
  so even a nominally exact subset must NOT be treated as fully paid.
- no_payment_record_in_input: absence from this *possibly incomplete* CSV,
  NOT proof the customer failed to pay.
- transfers with missing/unknown invoice refs: no amount-only fuzzy guesses.
  A real independent transfer may cover multiple invoices: an explicit
  authorized allocation ledger is required, **not built into this demo**.

VM2 correctness review should test duplicate event quarantine, case-sensitive
invoice references, cap behaviour, decimal boundaries, unmatched references,
repeated same hash with distinct log indices, absence of RPC confirmation and
report privacy. VM3 can present the buyer-facing local-only UI and limitations.
VM5 can offer a **separate buyer-authorized, fixed manual 50-record USDC paid
report** only after legitimate opt-in, independently verified payer/payee
identity where required, data handling, acceptance and payment terms. Do not
automatically initiate a Base USDC transfer, pay an escrow or claim acceptance.

No private customer CSV from CRM/SAGE/real wallets may be imported for a
trial without independent explicit authorization and lawful handling terms.
