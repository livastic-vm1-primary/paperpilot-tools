import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const txt=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const site=txt('services.html');
const contact=txt('contact.html');
const script=txt('contact.js');
const catalog=JSON.parse(txt('catalog.json'));
const offer=catalog.offers.find(x=>x.id==='google-workspace-invoice-intake-test-pilot-95-usdc');
test('existing services page includes ONE linked 95 native Circle Base USDC small business pilot',()=>{
  assert.equal((site.match(/id="workspace-invoice-intake"/g)||[]).length,1);
  assert.match(site,/95 USDC/);
  assert.match(site,/contact.html\?service=workspace-invoice/);
  assert.match(site,/owner-approved Gmail label/);
});
test('new service is an opt-in category, not an automatic payment',()=>{
  assert.match(contact,/<option value="Google Workspace Gmail Drive invoice intake QA">/);
  assert.match(script,/'workspace-invoice': 'Google Workspace Gmail Drive invoice intake QA'/);
  assert.match(contact,/name="third_party_form_consent"[^>]*required/);
  assert.doesNotMatch(script,/fetch\s*\(|sendBeacon|window\.ethereum|\.submit\(/);
});
test('manual offer price and real source are explicitly distinct from paid customer receipts',()=>{
  assert.equal(offer.indicative_price_native_base_circle_usdc,'95.000000');
  assert.equal(offer.network,'eip155:8453');
  assert.equal(offer.checkout_or_payment_enabled,false);
  assert.equal(offer.requires_written_scope_and_verified_lawful_payee,true);
  assert.equal(offer.independent_paid_customers,0);
  assert.equal(offer.real_google_workspace_customer_account_live_testing_confirmed,false);
  assert.equal(offer.existing_live_sage_or_bank_records_modified,false);
});
test('real original free source and tests exist, linked from services without copying buyer data',()=>{
  assert.ok(existsSync(new URL('../examples/google-workspace-invoice-staging/Code.gs',import.meta.url)));
  assert.ok(existsSync(new URL('../examples/google-workspace-invoice-staging/tests/intake.test.mjs',import.meta.url)));
  assert.match(site,/tree\/main\/examples\/google-workspace-invoice-staging/);
  assert.match(site,/19 mock-environment tests/);
  assert.match(site,/not<\/strong> hired us or paid/);
});
test('allowed business scope stays limited to private test copies and 10 fictional samples',()=>{
  assert.equal(offer.max_test_invoice_count,10);
  assert.equal(offer.default_preview_only,true);
  assert.equal(offer.requires_owner_explicit_gmail_drive_sheet_approval,true);
  assert.match(offer.caveat,/NOT proven installed in a live customer Workspace/);
  assert.match(site,/No OCR, taxes, SAGE API, real bank matching or production access/);
});
test('AI-readable catalog points to same URL and service and does not masquerade as legal contracting',()=>{
  const llm=txt('llms.txt');
  assert.match(llm,/services.html#workspace-invoice-intake/);
  assert.match(llm,/95 native Circle Base USDC/);
  assert.equal(offer.page,'https://livastic-vm1-primary.github.io/paperpilot-tools/services.html#workspace-invoice-intake');
  assert.equal(offer.inquiry,'https://livastic-vm1-primary.github.io/paperpilot-tools/contact.html?service=workspace-invoice');
  assert.match(site,/written, lawful buyer-agreed scope/);
});
