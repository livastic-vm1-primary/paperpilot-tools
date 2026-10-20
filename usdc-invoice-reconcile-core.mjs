/**
 * Original conservative OFFLINE invoice ↔ declared ERC-20 Transfer CSV inspector.
 * No network, no account access, no finality proof, no financial/tax advice.
 * The CSV cannot authenticate chain, token, recipient or transfer existence.
 */
export const INPUT_LIMIT = 262144;
export const ROW_LIMIT = 750;
export const BASE_NETWORK = 'eip155:8453';
export const CIRCLE_BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const key = s => String(s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const idPattern = /^[a-z0-9][a-z0-9_.:-]{0,79}$/i;
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = '0x'+'0'.repeat(40);
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const ZERO_TX_HASH = '0x' + '0'.repeat(64);
const unitsCap = 10n ** 24n;

function readCsv(source, title) {
  if (typeof source !== 'string' || !source.trim()) throw Error(title + ' CSV must include headers and rows.');
  if (new TextEncoder().encode(source).length > INPUT_LIMIT) throw Error(title + ' exceeds 256 KiB.');
  if (source.includes('\0') || source.includes('\ufffd')) throw Error(title + ' contains unsupported characters.');
  source = source.replace(/^\uFEFF/, '');
  const rows = [];
  let col = '', row = [], state = 0;
  const emit = () => {
    row.push(col); col = ''; state = 0;
    if (row.some(x => x.trim())) rows.push(row);
    row = [];
    if (rows.length > ROW_LIMIT + 1) throw Error(title + ' exceeds 750 data records.');
  };
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (state === 1) {
      if (c === '"' && source[i + 1] === '"') { col += '"'; i++; }
      else if (c === '"') state = 2;
      else col += c;
      continue;
    }
    if (state === 2 && c !== ',' && c !== '\r' && c !== '\n') throw Error(title + ' has invalid content after a CSV quote.');
    if (c === ',') { row.push(col); col = ''; state = 0; }
    else if (c === '\r' || c === '\n') {
      emit();
      if (c === '\r' && source[i + 1] === '\n') i++;
    } else if (c === '"') {
      if (col.length) throw Error(title + ' has unescaped quote.');
      state = 1;
    } else col += c;
  }
  if (state === 1) throw Error(title + ' has an unclosed quote.');
  if (row.length || col.length || state === 2) emit();
  if (rows.length < 2) throw Error(title + ' requires a header and data record.');
  const cols = rows.shift().map(key);
  if (cols.length < 3 || cols.length > 32 || cols.some(x=> !x || !/^[a-z0-9_]+$/.test(x)))
    throw Error(title + ' headers must have 3–32 supported column names.');
  if (new Set(cols).size !== cols.length) throw Error(title + ' has duplicate column headers.');
  return {
    headers: cols,
    rows: rows.map((fields, index) => ({ fields, record: index + 2, validShape: fields.length === cols.length }))
  };
}
const needed = (csv, required, title) => {
  for (const name of required) if (!csv.headers.includes(name)) throw Error(title + ' needs header ' + name + '.');
};
const value = (csv, row, name) => (row.fields[csv.headers.indexOf(name)] ?? '').trim();
const chain = s => s === '8453' || s.toLowerCase() === BASE_NETWORK ? BASE_NETWORK : s.toLowerCase();
const addr = s => addressPattern.test(s) ? s.toLowerCase() : null;
const invoiceId = s => idPattern.test(s) ? s : null;
function amount(s) {
  if (!/^\d+(?:\.\d{1,6})?$/.test(s)) return null;
  const [whole, fraction = ''] = s.split('.');
  if (whole.length > 19) return null; // never parse arbitrarily huge numbers
  const out = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
  return out > 0n && out <= unitsCap ? out : null;
}
function decimal(amountAtomic) {
  const fraction = String(amountAtomic % 1000000n).padStart(6, '0');
  return String(amountAtomic / 1000000n) + '.' + fraction;
}
function classification(status, row, details = {}) { return { record: row, status, ...details }; }

export function reconcileUsdcCsv(invoiceSource, transferSource) {
  const invoices = readCsv(invoiceSource, 'Invoices');
  const transfers = readCsv(transferSource, 'Transfers');
  needed(invoices, ['invoice_id', 'amount_usdc', 'chain_id', 'token_contract', 'pay_to'], 'Invoices');
  needed(transfers, ['tx_hash','log_index','invoice_id','amount_usdc','chain_id','token_contract','from_address','to_address'], 'Transfers');

  const byInvoice = new Map();
  const rowInvoices = invoices.rows.map(row => {
    const id = invoiceId(value(invoices, row, 'invoice_id'));
    const due = amount(value(invoices, row, 'amount_usdc'));
    const chainId = chain(value(invoices, row, 'chain_id'));
    const token = addr(value(invoices, row, 'token_contract'));
    const payTo = addr(value(invoices, row, 'pay_to'));
    const error = !row.validShape || !id || !due || !payTo || payTo === ZERO_ADDRESS || !token
      ? 'invalid_invoice_fields'
      : chainId !== BASE_NETWORK || token !== CIRCLE_BASE_USDC
      ? 'unsupported_invoice_asset_or_network' : null;
    const record = { record: row.record, id, due, chainId, token, payTo, error, allocations: [], blockers: [] };
    if (id) {
      if (!byInvoice.has(id)) byInvoice.set(id, []);
      byInvoice.get(id).push(record);
    }
    return record;
  });
  for (const group of byInvoice.values()) if (group.length > 1) {
    for (const item of group) item.error = 'duplicate_invoice_reference';
  }

  const indexed = transfers.rows.map(row => {
    const hash = value(transfers, row, 'tx_hash');
    const logText = value(transfers, row, 'log_index');
    const validLog = /^(?:0|[1-9]\d{0,8})$/.test(logText);
    const network = chain(value(transfers, row, 'chain_id'));
    const event = row.validShape && hashPattern.test(hash) && hash.toLowerCase() !== ZERO_TX_HASH && validLog
      ? JSON.stringify([network,hash.toLowerCase(),String(BigInt(logText))])
      : null;
    return {
      row, hash, event, network,
      invoice: invoiceId(value(transfers, row, 'invoice_id')),
      amount: amount(value(transfers, row, 'amount_usdc')),
      token: addr(value(transfers, row, 'token_contract')),
      from: addr(value(transfers, row, 'from_address')),
      to: addr(value(transfers, row, 'to_address'))
    };
  });
  const eventGroups = new Map();
  for (const item of indexed) if (item.event) {
    if (!eventGroups.has(item.event)) eventGroups.set(item.event, []);
    eventGroups.get(item.event).push(item);
  }
  const duplicateEvents = new Set([...eventGroups.entries()].filter(([,group])=>group.length > 1).map(([k])=>k));
  const transferStatuses = indexed.map(t => {
    const recipients = t.invoice ? byInvoice.get(t.invoice) : null;
    const related = recipients || [];
    const block = reason => {
      for (const invoice of related) invoice.blockers.push(t.row.record);
      return classification(reason, t.row.record);
    };
    if (!t.row.validShape || !t.event || !t.amount || !t.token || !t.from || !t.to)
      return block('invalid_transfer_fields');
    if (duplicateEvents.has(t.event)) return block('duplicate_event_identity_review');
    if (t.to === ZERO_ADDRESS) return block('declared_burn_not_customer_payment');
    if (t.from === ZERO_ADDRESS) return block('declared_mint_not_customer_payment');
    if (t.from === t.to) return block('declared_self_transfer_not_independent_customer_payment');
    if (t.network !== BASE_NETWORK) return block('declared_wrong_network');
    if (t.token !== CIRCLE_BASE_USDC) return block('declared_wrong_asset');
    if (!t.invoice) return classification('no_invoice_reference',t.row.record);
    if (!recipients) return classification('unknown_invoice_reference',t.row.record);
    if (recipients.length !== 1 || recipients[0].error) return block('ambiguous_or_invalid_invoice_reference');
    const invoice = recipients[0];
    if (t.to !== invoice.payTo) return block('declared_wrong_recipient');
    invoice.allocations.push({record:t.row.record, amount:t.amount});
    return classification('candidate_attributed_unverified',t.row.record);
  });

  const invoiceStatuses = rowInvoices.map(i => {
    if (i.error) return classification(i.error, i.record);
    const credited = i.allocations.reduce((sum,a)=>sum+a.amount,0n);
    const missing = credited < i.due ? i.due - credited : 0n;
    const excess = credited > i.due ? credited - i.due : 0n;
    const status = i.blockers.length ? 'review_required_exception'
      : credited === 0n ? 'no_payment_record_in_input'
      : credited < i.due ? 'candidate_partial_underpaid'
      : credited > i.due ? 'candidate_overpaid_review'
      : 'candidate_exact_amount_only';
    return classification(status,i.record,{
      due_usdc:decimal(i.due),
      attributed_usdc:decimal(credited),
      shortfall_usdc:decimal(missing),
      overage_usdc:decimal(excess),
      transfer_records:i.allocations.map(a=>a.record).slice(0,50),
      exception_transfer_records:[...new Set(i.blockers)].slice(0,50)
    });
  });
  const counted = rows => Object.fromEntries([...new Set(rows.map(x=>x.status))].sort().map(k=>[k,rows.filter(x=>x.status===k).length]));
  return {
    version:1,
    input: {invoice_records: invoices.rows.length, transfer_records:transfers.rows.length},
    declared_expected_chain:BASE_NETWORK,
    declared_expected_token:'native Circle USDC on Base mainnet',
    invoice_status_counts:counted(invoiceStatuses),
    transfer_status_counts:counted(transferStatuses),
    invoice_records:invoiceStatuses,
    transfer_records:transferStatuses,
    all_row_numbers_are_CSV_record_numbers_not_line_numbers:true,
    raw_invoice_ids_wallet_addresses_and_tx_hashes_omitted_from_report:true,
    zero_address_burn_mint_and_self_transfer_rejected_as_customer_receipt_candidates:true,
    actual_rpc_receipt_log_and_finality_verified:false,
    taxes_fraud_prevention_or_audit_opinion_provided:false,
    warning:'UNVERIFIED CSV candidate matching, not real settlement proof. Chain IDs, token contracts, invoice references, recipients, amounts and tx/log indices are untrusted buyer-supplied text. Confirm canonical Base8453 Circle USDC ERC20 logs, recipient, uniqueness, confirmations and invoice ownership separately via authorized independent chain records before posting or releasing goods. Never automatically delete, pay, refund or invoice from this report. Duplicates are quarantined, not silently deduplicated. No amount-only matching.'
  };
}

export const fictionalInvoices = [
  'invoice_id,amount_usdc,chain_id,token_contract,pay_to',
  'FAKE-100,10,eip155:8453,'+CIRCLE_BASE_USDC+',0x'+'1'.repeat(40),
  'FAKE-101,20,8453,'+CIRCLE_BASE_USDC+',0x'+'1'.repeat(40),
  'FAKE-102,15,8453,'+CIRCLE_BASE_USDC+',0x'+'1'.repeat(40),
  'FAKE-103,7,8453,'+CIRCLE_BASE_USDC+',0x'+'1'.repeat(40),
  'FAKE-104,9,8453,'+CIRCLE_BASE_USDC+',0x'+'1'.repeat(40)
].join('\r\n');
export const fictionalTransfers = [
  'tx_hash,log_index,invoice_id,amount_usdc,chain_id,token_contract,from_address,to_address',
  '0x'+'a'.repeat(64)+',0,FAKE-100,10,8453,'+CIRCLE_BASE_USDC+',0x'+'2'.repeat(40)+',0x'+'1'.repeat(40),
  '0x'+'a'.repeat(64)+',1,FAKE-101,8,8453,'+CIRCLE_BASE_USDC+',0x'+'2'.repeat(40)+',0x'+'1'.repeat(40),
  '0x'+'b'.repeat(64)+',0,FAKE-102,15,eip155:1,'+CIRCLE_BASE_USDC+',0x'+'2'.repeat(40)+',0x'+'1'.repeat(40),
  '0x'+'c'.repeat(64)+',0,FAKE-103,7,8453,'+CIRCLE_BASE_USDC+',0x'+'2'.repeat(40)+',0x'+'1'.repeat(40),
  '0x'+'c'.repeat(64)+',0,FAKE-103,7,8453,'+CIRCLE_BASE_USDC+',0x'+'2'.repeat(40)+',0x'+'1'.repeat(40),
  '0x'+'d'.repeat(64)+',0,FAKE-104,10,8453,'+CIRCLE_BASE_USDC+',0x'+'2'.repeat(40)+',0x'+'1'.repeat(40),
  '0x'+'e'.repeat(64)+',0,NOT-AN-INVOICE,5,8453,'+CIRCLE_BASE_USDC+',0x'+'2'.repeat(40)+',0x'+'1'.repeat(40)
].join('\r\n');
