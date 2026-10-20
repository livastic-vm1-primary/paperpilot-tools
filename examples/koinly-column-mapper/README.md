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
