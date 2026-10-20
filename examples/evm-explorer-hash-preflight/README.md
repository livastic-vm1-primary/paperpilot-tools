# EVM explorer CSV — transaction-hash discovery preflight (free, local-only)

This is original AI-assisted experimental Python 3 standard-library source
inspired by a concrete public maintainer need:
https://github.com/rotki/rotki/issues/13351 . The rotki maintainers have
NOT requested, paid for, reviewed, approved, or integrated this sample.
It is NOT a rotki plugin, tax product, blockchain importer, Etherscan
scraper, or proof that a user's onchain history is complete.

## What the tool actually does

Given one authorized, non-confidential Etherscan-style CSV file, and a
user-selected positive numeric EVM chain ID, it reports counts of hashes
that match the exact 32-byte EVM transaction format, malformed rows,
reused hash-discovery rows, and a conservative 5,000-row cap warning.

Run the wholly fictional demo without an export:

    python3 examples/evm-explorer-hash-preflight/preflight.py --demo --chain 8453

Run against a LOCAL authorized CSV without uploading it:

    python3 examples/evm-explorer-hash-preflight/preflight.py --file /path/to/local-export.csv --chain 1

Run original offline regressions:

    python3 -m unittest discover -s examples/evm-explorer-hash-preflight -p 'test_*.py' -v

Expected in the 3-row fiction: 2 unique hashes for *RPC lookup*, 1 repeated
hash-discovery row. That is **NOT** permission to delete any token transfer,
trace or economic event. The output never prints original hashes, financial
data, filenames or private notes. No network access, wallet, signing, RPC
call, credentials, storage, tax advice or payment.

Important design decisions for an actual importer:
- A transaction hash can be repeated across many ERC-20 Transfer logs and
  internal traces. Deduplicate hashes only for *RPC discovery*, never
  individual ledger or tax events on the basis of hash alone.
- An imported internal tx needs its canonical trace ID; the CSV field
  may not contain it.
- Full EVM records need nonce, calldata, gas and canonical receipts/logs.
  Never fabricate fields from missing CSV columns.
- A 5,000-row Etherscan export may have reached an exporter cap; an exact
  count is NOT proof of truncation. Overlap bounded dates/blocks to verify.
- A selected chain is NOT validated by the CSV. Check it against the intended
  authorized RPC before any chain-specific fetch.
- Do not mark used_query_ranges complete based on CSV imports.

Inputs are restricted to 4 MiB / 5,500 data rows / 80 columns.
Header aliases: Transaction Hash, Txn Hash, Tx Hash, TxHash. Other explorer
formats (Blockscout, NFT transfers, files without a stable hash field)
were NOT verified. Tests use fictional hashes.

This is freely inspectable engineering input, not a confirmed customer
purchase, an accepted external commission, or a production import integration.
