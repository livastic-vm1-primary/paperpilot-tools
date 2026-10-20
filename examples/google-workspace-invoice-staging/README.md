# Free Gmail → Drive → Sheets invoice intake: deterministic first-stage pilot

Original, AI-assisted source written for one human beneficial owner. MIT-style
reuse is allowed. **Not a production deployment or a commissioned customer
integration.** It answers a publicly expressed small-business need: roughly
150 supplier/customer finance documents per month, existing Gmail/Drive/Sheets
and Apps Script, concern about duplicate records, retry failures and preserving
a live financial workbook. This sample does not claim the business hired us.

The key design decision: **nothing is written to your live transactions
spreadsheet or SAGE One**. One new, private staging sheet receives minimal
metadata, and each archived PDF still requires human review.

## Features that run now

- An explicit invoice Gmail label bounds which messages can be read.
- Scan at most 200 labeled Gmail threads / 250 matching PDF attachments,
  handling one page of 40 threads at a time.
- Ignore inline images, non-PDF attachments, incorrect MIME types, and
  files larger than 5 MiB. PDFs are not executed or passed to an AI service.
- Detect bitwise-identical forwarded/resubmitted PDFs with SHA-256, rather
  than only relying on the Gmail message ID.
- Stage up to **25 new distinct files per manual commit execution**, with
  status NEEDS_HUMAN_REVIEW. Repeating the execution skips existing hashes
  and continues to the next unseen items. If the scan is truncated, narrow
  your label/query or use a separate authorized batch rather than hiding
  older invoices.
- Generate deterministic private Drive filenames from content SHA-256;
  if a previous attempt created the file but failed to append to Sheets,
  retry finds that exact name without uploading another copy.
- Use an Apps Script LockService lock for one running instance, and abort
  if the staging spreadsheet headers have been changed.
- The default preview returns counts only. Explicit commit is disabled until
  ALLOW_ARCHIVE_COMMIT=YES is set by the installing account holder.

The script **never** moves/deletes or marks Gmail mail read, sends replies,
updates SAGE, changes a Movimentos/Transactions sheet, connects to a wallet,
writes a bank transaction, sets a time trigger, pays crypto or calls third-
party web APIs. These constraints are also checked by unit tests.

## Safe installation on a TEST Google Workspace

These are instructions for a real business owner working under their own
permissions. Do not paste OAuth tokens, invoice PDFs, IDs, login passwords,
or customer contact information into a public chat or repository.

1. Make a private copy of your bookkeeping spreadsheet, **not** your live
   finance file. Add a new tab named InvoiceStaging, and place **exactly**
   these five headers in row 1:

   ~~~text
   sha256 | gmailMessageId | archiveFileId | status | createdAtUTC
   ~~~

   This sheet should be private to trusted reviewers. Gmail message IDs and
   Drive file IDs are operational records, not public information.

2. Create a new empty private Google Drive folder called
   TEST Invoice Archive. **Do not use your original operational archive**
   for a first test.
3. Create a Gmail label named invoice-review. Label only a handful of
   harmless synthetic test emails, each with a fictional PDF attachment.
4. Make a standalone Google Apps Script project under the business owner's
   actual Google Workspace account and paste Code.gs. Inspect the source
   first: using GmailApp/DriveApp/SpreadsheetApp requests the corresponding
   Google authorization scopes in your own account.
5. In Apps Script Project Settings > Script Properties, set:

   ~~~text
   STAGING_SHEET_ID       = your private staging spreadsheet ID
   ARCHIVE_FOLDER_ID      = your TEST Drive folder ID
   INVOICE_GMAIL_QUERY   = label:invoice-review has:attachment newer_than:30d
   ALLOW_ARCHIVE_COMMIT  = NO
   ~~~

6. Run previewInvoiceIntake manually. It returns candidate/duplicate/error
   counts but creates **no** Drive files or sheet rows. Review whether all
   sample attachments are expected.
7. Only in your TEST account, change ALLOW_ARCHIVE_COMMIT to YES; run
   archiveInvoicesToStaging manually. Check that newly archived Drive files
   have deterministic invoice-[sha256].pdf names and that each registry row
   says NEEDS_HUMAN_REVIEW. Re-run to test idempotent behavior.
8. Move to real business data only after a human has approved retention,
   access rights, authorized sender label, and the process for handling
   exceptions/incorrect PDFs. Do **not** automatically post anything to
   the main books.

### Free offline tests

This repository has runnable Node tests that simulate the Apps Script
environment; they do not access real Gmail, Sheets or Drive.

~~~sh
node --test examples/google-workspace-invoice-staging/tests/intake.test.mjs
~~~

The tests cover zero writes in preview, explicit opt-in, identical PDFs
forwarded across messages, missing/changed staging headers, malformed MIME,
oversized attachments, lock contention, retry after a failed Sheet append,
multi-page Gmail search, and 35 novel invoices advancing across two runs.

**A passing Node test suite does not prove that Google Apps Script has been
installed, authorized, granted scopes or tested against a real Workspace.**
The client must independently test that on a private copied project.

## Boundaries and honest commercial option

This sample does **not** extract OCR text, classify invoice tax treatment,
check VAT, infer cost centers, integrate with SAGE One, reconcile the bank,
or guarantee legal/accounting compliance. It is intentionally a small
non-destructive document-ingestion building block. PDFs may contain malware;
only archive trusted business documents and apply your own provider's
scanning, access and data-retention policy. A hash is an exact-file
duplicate signal, not semantic invoice-number duplication; those require
separate authorized business rules and human decisions.

There is an **indicative 95 native Circle Base USDC** fixed-scope setup/QA
pilot for one owner-approved test Gmail label, one Drive folder and one
staging sheet, with up to ten fictional/sample test invoices and a concise
handover. Only after a real independent purchaser accepts a written
project scope, cancellation/refund terms, jurisdiction/identity eligibility
and payment destination would any payment be requested. There is **no
automatic checkout here, no contracted buyer and no buyer payment to date**.
See the existing one-owner [PaperPilot contact page](https://livastic-vm1-primary.github.io/paperpilot-tools/contact.html)
if a custom implementation is genuinely useful.

### How this relates to the original problem

The public request at
https://www.reddit.com/r/CRM/comments/1x5wje0/how_would_you_automate_financial_document_and/
specifically asks for preserving current Sheets/Gmail/Drive integrations,
avoiding duplicates and having reliable retries. This sample contributes
*only* the first ingestion-and-staging building block, with transparent
implementation and tests. It is not an affiliation, endorsement or customer
testimonial from the poster or that company.
