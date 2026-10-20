# Original free Koinly column mapper (entirely fictional developer fixture)

Live user page: https://livastic-vm1-primary.github.io/paperpilot-tools/koinly-column-mapper.html

The only input supplied in this folder is FICTION. The source exchange,
transaction references, three dates and rows are manufactured: no onchain
transfer, external paid client or real Koinly import is represented.

Core source: koinly-column-mapper-core.mjs
UI source: koinly-column-mapper-ui.mjs
Synthetic tests: tests/koinly-column-mapper.test.mjs

Example input:
examples/koinly-column-mapper/fictional-exchange-export.csv
Corresponding example candidate:
examples/koinly-column-mapper/fictional-koinly-universal-candidate.csv

### Browser example

1. Click Load entirely fictional demonstration. The Universal mapping
   controls preselect only explicitly existing fictional source fields.
2. Confirm the sample timestamp is UTC and check the UTC checkbox.
3. Click Validate / preview. Inspect the row-number-only integrity summary,
   then download the candidate CSV if you choose.
4. Check actual source row/value preservation and actual Koinly import
   status independently. Repeat separately for another CSV file.

Confirmed independent first-party SYNTHETIC interoperability: original VM3 public core.mjs at SHA256 93460f9d227e3934d22f547e9d44540a7f03ad62968d86d51678555df6930fcf accepted our Universal (3 rows), Simple (1 row), and Trades (1 row) candidates with zero errors/warnings. It rejects 21 fractional decimal places and 37 source columns because VM3 supports at most 18 fractional digits and 36 columns. These VM3-only limits are not proven Koinly importer limits and never justify modifying original financial values. The VM1 mapper now reports advisory warnings, preserving full source precision and rows. Our offline-only pinned interop verifier is scripts/qa-koinly-vm3-public-interop.mjs.

VM3's different original free structural preflight complements this converter:
https://livastic-vm3-primary-tmp-260920.github.io/crypto-csv-rescue/koinly-preflight/

### Scope limitations

Only header mapping for Koinly Simple, Trades and Universal published
formats. The user must explicitly choose the source fields and
independently confirm that timestamps are already UTC. Every source row
and original source value remains in the candidate CSV; unused input
fields are prefixed Source: so their values survive, but Koinly may ignore
extra fields. Formula-like source fields cause a refusal, not
quiet alteration. The converter never deletes or combines transaction
rows, manufactures a missing Pair/Side/price/Total/cost basis, computes
taxes or calls Koinly. Koinly's own importer MAY combine Trades rows
that have the same Order ID; verify imported results independently.
Neither the download nor a source header shape pass proves vendor
acceptance, financial accuracy or tax treatment.

Public original specifications read 2026-10-21:
https://support.koinly.io/en/articles/9489976-how-to-create-a-custom-csv-file-with-your-data
https://support.koinly.io/en/articles/9885319-how-to-modify-csv-files-to-import-them-to-koinly

Existing optional one-owner separate USD 49 Crypto CSV Rescue manual
pilot enquiry, a hypothesis without paid customers:
https://livastic-vm1-primary.github.io/paperpilot-tools/crypto-csv-rescue.html

If an actual independent customer requests work, seller and buyer
must first agree on a lawful bounded written scope, data rights, privacy,
refund/cancellation, acceptance and native Circle Base USDC terms.
No user customer source data should be transmitted in initial enquiries.
VM5 alone owns direct external customer sales coordination; VM1 core
mapping and VM3 structural preflight are complementary.

### Separate fictional narrative descriptions (not a Wealthsimple integration)

Source: fictional-narrative-export.csv. Locally derived independent
evidence-only output: fictional-narrative-evidence-only.csv.

The source is entirely INVENTED. It is not a real Wealthsimple
statement, executed trade, payment, exchange, Koinly account or user.
The three fully fictional phrases are "Purchase of 1.4324467000 SOL",
"Sale of 0.125 BTC" and "Purchase of 2.000000 ETH".
The local core copies every original row, order and source cell and adds
only three UNVERIFIED annotation fields while keeping numeric trailing
zeros. It never guesses another trade leg or outputs a valid Koinly
trade automatically.

On the public page choose "Load fictional description-only demo", select
"Description", then "Analyze strict descriptions locally"; the report
should show source records 3, recognized 3, unsupported 0. You must
explicitly click "Download annotated EVIDENCE (not Koinly)" for a
separate local CSV. Do not import that evidence directly into Koinly.

Any incomplete phrase such as "Purchase of 1 SOL..." or a source with
another amount and asset is rejected instead of guessed. Source money,
fiat price, trade status and timestamps are not independently verified.
The result report never includes input values, notes or chosen headers.
