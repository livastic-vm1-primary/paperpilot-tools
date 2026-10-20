import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcileUsdcCsv,fictionalInvoices,fictionalTransfers,CIRCLE_BASE_USDC,INPUT_LIMIT} from '../usdc-invoice-reconcile-core.mjs';

const payee='0x'+'1'.repeat(40);
const wrongPayee='0x'+'3'.repeat(40);
const sender='0x'+'2'.repeat(40);
const ZERO='0x'+'0'.repeat(40);
const H=(x)=>'0x'+x.repeat(64);
const ih='invoice_id,amount_usdc,chain_id,token_contract,pay_to';
const th='tx_hash,log_index,invoice_id,amount_usdc,chain_id,token_contract,from_address,to_address';
const inv=(id='I1',due='1',to=payee,chain='8453',token=CIRCLE_BASE_USDC)=>[ih,[id,due,chain,token,to].join(',')].join('\n');
const tr=(id='I1',amt='1',hash=H('a'),log='0',chain='8453',token=CIRCLE_BASE_USDC,to=payee,from=sender)=>[th,[hash,log,id,amt,chain,token,from,to].join(',')].join('\n');
const inspect=(a=inv(),b=tr())=>reconcileUsdcCsv(a,b);
const status=r=>r.invoice_records[0].status;
const tstatus=r=>r.transfer_records[0].status;
const file=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('fully fictional preview gives expected distinct reviewed statuses',()=>{
  const r=inspect(fictionalInvoices,fictionalTransfers);
  assert.deepEqual(r.input,{invoice_records:5,transfer_records:7});
  assert.deepEqual(r.invoice_status_counts,{
    candidate_exact_amount_only:1,candidate_overpaid_review:1,
    candidate_partial_underpaid:1,review_required_exception:2
  });
  assert.equal(r.transfer_status_counts.duplicate_event_identity_review,2);
  assert.equal(r.transfer_status_counts.declared_wrong_network,1);
  assert.equal(r.transfer_status_counts.unknown_invoice_reference,1);
  assert.equal(r.actual_rpc_receipt_log_and_finality_verified,false);
});
test('exact reference and units are candidate only, never true paid',()=>{
  const r=inspect();assert.equal(status(r),'candidate_exact_amount_only');
  assert.equal(r.invoice_records[0].attributed_usdc,'1.000000');
  assert.match(r.warning,/not real settlement proof/);
  assert.equal(r.taxes_fraud_prevention_or_audit_opinion_provided,false);
});
test('same transaction hash with TWO DISTINCT log indices are distinct valid event candidates',()=>{
  const a=inv('A','3');
  const b=[th,...[tr('A','1',H('c'),'0').split('\n')[1],tr('A','2',H('c'),'1').split('\n')[1]]].join('\n');
  const r=inspect(a,b);
  assert.equal(status(r),'candidate_exact_amount_only');
  assert.equal(r.transfer_status_counts.candidate_attributed_unverified,2);
  assert.equal(r.invoice_records[0].attributed_usdc,'3.000000');
});
test('duplicate chain + hash + log index quarantines BOTH rows not counted as received',()=>{
  const row=tr().split('\n')[1],b=[th,row,row].join('\n');
  const r=inspect(inv(),b);
  assert.equal(status(r),'review_required_exception');
  assert.equal(r.invoice_records[0].attributed_usdc,'0.000000');
  assert.deepEqual(r.invoice_records[0].exception_transfer_records,[2,3]);
  assert.equal(r.transfer_status_counts.duplicate_event_identity_review,2);
});
test('partial payment via exact six-decimal integers',()=>{
  const r=inspect(inv('I1','1.000001'),tr('I1','0.999999'));
  assert.equal(status(r),'candidate_partial_underpaid');
  assert.equal(r.invoice_records[0].shortfall_usdc,'0.000002');
});
test('separate eligible partial transfers can be summed without amount-only guesses',()=>{
  const b=[th,tr('I1','0.500000',H('a'),'0').split('\n')[1],tr('I1','0.500001',H('b'),'0').split('\n')[1]].join('\n');
  const r=inspect(inv('I1','1.000001'),b);
  assert.equal(status(r),'candidate_exact_amount_only');
  assert.deepEqual(r.invoice_records[0].transfer_records,[2,3]);
});
test('overpayment does not imply refund authorization',()=>{
  const r=inspect(inv(),tr('I1','1.000001'));
  assert.equal(status(r),'candidate_overpaid_review');
  assert.equal(r.invoice_records[0].overage_usdc,'0.000001');
  assert.match(r.warning,/Never automatically delete, pay, refund/);
});
test('wrong network quarantined, does not increment credited',()=>{
  const r=inspect(inv(),tr('I1','1',H('a'),'0','eip155:1'));
  assert.equal(tstatus(r),'declared_wrong_network');
  assert.equal(status(r),'review_required_exception');
});
test('bridged or wrong token quarantined',()=>{
  const r=inspect(inv(),tr('I1','1',H('a'),'0','8453',wrongPayee));
  assert.equal(tstatus(r),'declared_wrong_asset');
  assert.equal(r.invoice_records[0].attributed_usdc,'0.000000');
});
test('wrong recipient quarantined, even with exact claimed amount',()=>{
  const r=inspect(inv(),tr('I1','1',H('a'),'0','8453',CIRCLE_BASE_USDC,wrongPayee));
  assert.equal(tstatus(r),'declared_wrong_recipient');
  assert.equal(status(r),'review_required_exception');
});
test('unknown invoice ID is not guessed by matching 1 USDC amount',()=>{
  const r=inspect(inv('I1','1'),tr('I-other','1'));
  assert.equal(tstatus(r),'unknown_invoice_reference');
  assert.equal(status(r),'no_payment_record_in_input');
});
test('missing invoice association is not guessed by same amount',()=>{
  const r=inspect(inv('I1','1'),tr('','1'));
  assert.equal(tstatus(r),'no_invoice_reference');
  assert.equal(status(r),'no_payment_record_in_input');
});
test('same invoice_id twice is NOT overwritten or merged silently',()=>{
  const a=[ih,inv().split('\n')[1],inv().split('\n')[1]].join('\n');
  const r=inspect(a,tr());
  assert.equal(r.invoice_status_counts.duplicate_invoice_reference,2);
  assert.equal(tstatus(r),'ambiguous_or_invalid_invoice_reference');
});
test('declared invoice wrong network cannot be settled',()=>{
  const r=inspect(inv('I1','1',payee,'eip155:1'));
  assert.equal(status(r),'unsupported_invoice_asset_or_network');
});
test('declared invoice bridged asset cannot be settled',()=>{
  const r=inspect(inv('I1','1',payee,'8453',wrongPayee));
  assert.equal(status(r),'unsupported_invoice_asset_or_network');
});
test('invalid tx hash fails closed for attribution',()=>{
  const r=inspect(inv(),tr('I1','1','0xabc'));
  assert.equal(tstatus(r),'invalid_transfer_fields');
  assert.equal(status(r),'review_required_exception');
});
test('negative or invalid log-index fails closed',()=>{
  for(const n of ['-1','1.3','1e3','']) {
    const r=inspect(inv(),tr('I1','1',H('a'),n));
    assert.equal(tstatus(r),'invalid_transfer_fields');
  }
});
test('zero, negative, exponential, too many decimals and nondecimal amounts fail closed',()=>{
  for(const n of ['0','0.000000','-1','1e6','1.0000001','2,000','NaN','0x1']) {
    assert.equal(status(inspect(inv('I1',n))),'invalid_invoice_fields',n);
  }
});
test('BOM, quoted header, CRLF, quoted commas and embedded newlines work',()=>{
  const a='\uFEFF"invoice_id","amount_usdc",chain_id,token_contract,pay_to\r\n'+inv('I1','1').split('\n')[1]+'\r\n';
  const b=tr()+'\n';
  assert.equal(status(inspect(a,b)),'candidate_exact_amount_only');
  const x=inspect(a.replace('I1','I1'),b);
  assert.equal(x.input.invoice_records,1);
});
test('invalid quote and malformed UTF8 replacement fail closed',()=>{
  assert.throws(()=>inspect(ih+'\n"I1,1,8453,'+CIRCLE_BASE_USDC+','+payee),/unclosed quote/);
  assert.throws(()=>inspect(inv(),tr().replace('I1','\ufffd')),/unsupported characters/);
});
test('row-shape mismatch is an exception, not an attributed payment',()=>{
  const b=tr().replace(',1,8453,',',1,8453,,');
  const r=inspect(inv(),b);
  assert.equal(tstatus(r),'invalid_transfer_fields');
  assert.equal(status(r),'review_required_exception');
});
test('headers require stable identifiers and refuse collision',()=>{
  assert.throws(()=>inspect(inv().replace('invoice_id','amount_usdc')),/duplicate column headers/);
  assert.throws(()=>inspect(inv().replace('invoice_id','source')),/needs header invoice_id/);
  assert.throws(()=>inspect(inv(),tr().replace('tx_hash','source')),/needs header tx_hash/);
});
test('bounds cap bytes, record count, and NUL',()=>{
  assert.throws(()=>inspect(inv('I1','1'+'9'.repeat(INPUT_LIMIT))),/256 KiB/);
  const rows=Array(751).fill(inv().split('\n')[1]);
  assert.throws(()=>inspect([ih,...rows].join('\n')),/750 data records/);
  assert.throws(()=>inspect(inv().replace('I1','I\0')),/unsupported characters/);
});
test('actual raw identifiers, payee addresses and transfer hashes never echoed in report',()=>{
  const inputId='PRIVATE-ORDER-97653';
  const r=inspect(inv(inputId,'1'),tr(inputId,'1',H('f')));
  const s=JSON.stringify(r);
  assert.equal(s.includes(inputId),false);
  assert.equal(s.includes(H('f')),false);
  assert.equal(s.includes(payee),false);
  assert.equal(s.includes(CIRCLE_BASE_USDC),false);
  assert.equal(r.raw_invoice_ids_wallet_addresses_and_tx_hashes_omitted_from_report,true);
});
test('site is fail-closed CSP local-only, has consent quote, no unverified checkout',()=>{
  const html=file('usdc-invoice-reconcile.html');
  const ui=file('usdc-invoice-reconcile-ui.mjs');
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/id="recon-invoices"/);
  assert.match(html,/id="recon-transfers"/);
  assert.match(html,/contact\.html\?service=usdc-invoice-pilot/);
  assert.match(html,/USD 49/);
  assert.match(html,/not proven demand/);
  assert.match(html,/candidate matching ONLY/i);
  assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|ethereum\.request|web3|navigator\.sendBeacon|innerHTML/);
  assert.match(ui,/textContent/);
});

test('burn recipient zero is explicitly quarantined, not counted as a merchant payment',()=>{
  const r=inspect(inv('I1','1',ZERO),tr('I1','1',H('a'),'0','8453',CIRCLE_BASE_USDC,ZERO));
  assert.equal(status(r),'invalid_invoice_fields');
  assert.equal(tstatus(r),'declared_burn_not_customer_payment');
  assert.equal(r.zero_address_burn_mint_and_self_transfer_rejected_as_customer_receipt_candidates,true);
});
test('zero-from mint cannot be claimed as independent customer remittance',()=>{
  const r=inspect(inv(),tr('I1','1',H('a'),'0','8453',CIRCLE_BASE_USDC,payee,ZERO));
  assert.equal(tstatus(r),'declared_mint_not_customer_payment');
  assert.equal(status(r),'review_required_exception');
  assert.equal(r.invoice_records[0].attributed_usdc,'0.000000');
});
test('sender equals receiver self-transfer cannot be claimed as new outside payment',()=>{
  const r=inspect(inv(),tr('I1','1',H('a'),'0','8453',CIRCLE_BASE_USDC,payee,payee));
  assert.equal(tstatus(r),'declared_self_transfer_not_independent_customer_payment');
  assert.equal(status(r),'review_required_exception');
});
test('missing from_address column or invalid sender is never proof of a customer payment',()=>{
  const r=inspect(inv(),tr('I1','1',H('a'),'0','8453',CIRCLE_BASE_USDC,payee,'0xabc'));
  assert.equal(tstatus(r),'invalid_transfer_fields');
  assert.equal(status(r),'review_required_exception');
  assert.throws(()=>inspect(inv(),tr().replace(',from_address,',',')), /needs header from_address/);
});


test('canonical committed fictional invoice and Transfer CSV fixtures match the known summary',()=>{
  const dir='examples/usdc-invoice-reconcile/fixtures/';
  const invoices=file(dir+'synthetic-invoices.csv');
  const transfers=file(dir+'synthetic-declared-transfers.csv');
  const expected=JSON.parse(file(dir+'expected-summary.json'));
  const result=inspect(invoices,transfers);
  assert.equal(expected.synthetic_only,true);
  assert.deepEqual(result.invoice_status_counts,expected.invoice_status_counts);
  assert.deepEqual(result.transfer_status_counts,expected.transfer_status_counts);
  assert.equal(result.actual_rpc_receipt_log_and_finality_verified,false);
  assert.equal(expected.paid_customers,0);
  assert.equal(result.zero_address_burn_mint_and_self_transfer_rejected_as_customer_receipt_candidates,true);
});
test('home page discovery link and public no-wallet scope are present',()=>{
  const home=file('index.html');
  assert.match(home,/href="usdc-invoice-reconcile\.html"/);
  const html=file('usdc-invoice-reconcile.html');
  assert.match(html,/zero-address burn\/mint and self-to-self transfers/);
  assert.match(html,/No actual merchant adoption, paid buyer/);
  assert.match(html,/FormSubmit|outside email-form provider/);
});
