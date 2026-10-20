/**
 * Plain-language commentary over UNVERIFIED, synthetic-friendly CSV evidence.
 * Never constructs a paid/unpaid/finalized blockchain assertion or exposes IDs.
 */
const INVOICE = Object.freeze({
  candidate_exact_amount_only: 'The amounts in the two supplied CSVs agree. Independently verify the canonical chain receipt, token, recipient and invoice attribution before treating it as paid.',
  candidate_partial_underpaid: 'The attributed CSV amount is short. Check authorized source data for missing or additional installments. Do not ask for another payment solely from this preview.',
  candidate_overpaid_review: 'The attributed CSV amount exceeds the invoice. Confirm the source and buyer ownership independently; do not automatically refund.',
  review_required_exception: 'One or more claimed transfer rows are quarantined. Review the specific transfer row statuses before trusting this invoice.',
  no_payment_record_in_input: 'No eligible claim appeared in this bounded CSV. This is NOT proof the buyer failed to pay.',
  duplicate_invoice_reference: 'This invoice ID occurs more than once. Correct the source reference rather than guessing which invoice receives a transfer.',
  invalid_invoice_fields: 'Required invoice evidence is malformed, missing, zero-address or nonsensical. Correct the source record before reconciliation.',
  unsupported_invoice_asset_or_network: 'The invoice declares a network or token other than canonical Circle Base USDC. No payment attribution is permitted.'
});
const TRANSFER = Object.freeze({
  candidate_attributed_unverified: 'This claimed event has a unique row identity and a specific invoice reference, but it is NOT an independently verified transfer.',
  duplicate_event_identity_review: 'This chain + hash + log-index identity repeats. Every copy was quarantined; do not delete event records or count the payment.',
  declared_burn_not_customer_payment: 'Zero-address destination is a burn candidate, not a merchant receipt.',
  declared_mint_not_customer_payment: 'Zero-address origin is a mint candidate, not independent customer payment.',
  declared_self_transfer_not_independent_customer_payment: 'Sender and destination match. This is not an independent incoming buyer payment.',
  declared_wrong_network: 'This CSV row declares another network. Do not credit the Base invoice.',
  declared_wrong_asset: 'This CSV row declares a noncanonical Base USDC token. Do not credit the invoice.',
  declared_wrong_recipient: 'This event claims a recipient other than the authorized invoice payee.',
  invalid_transfer_fields: 'Malformed event identity, from/to address, amount, row shape or placeholder hash. No credit is allowed.',
  ambiguous_or_invalid_invoice_reference: 'Invoice source ID is duplicated or invalid, so automatic attribution would be unsafe.',
  unknown_invoice_reference: 'Claimed invoice reference does not occur in the invoice CSV. No amount-only guessing.',
  no_invoice_reference: 'No explicit authorized invoice assignment. A blockchain Transfer log does not intrinsically include an invoice ID.'
});
const dollars = x => typeof x === 'string' && /^\d+\.\d{6}$/.test(x) ? x + ' USDC' : '—';
export function summarizeUnverifiedReport(report, maxVisible = 50) {
  if (!report || typeof report !== 'object' ||
      !Array.isArray(report.invoice_records) || !Array.isArray(report.transfer_records))
    throw Error('A completed local CSV candidate report is required.');
  if (!Number.isInteger(maxVisible) || maxVisible < 1 || maxVisible > 100)
    throw Error('Visible row cap must be an integer from 1 to 100.');
  const invoices = report.invoice_records.slice(0,maxVisible).map(x=>({
    row: x.record,
    status: x.status,
    claimed: dollars(x.attributed_usdc),
    shortfall: dollars(x.shortfall_usdc),
    nextStep: INVOICE[x.status] || 'Needs separate manual review. Do not presume an actual payment.'
  }));
  const transfers = report.transfer_records.slice(0,maxVisible).map(x=>({
    row: x.record,
    status: x.status,
    nextStep: TRANSFER[x.status] || 'Needs separate manual review. Do not presume a valid transfer.'
  }));
  return {
    invoices,
    transfers,
    invoiceTotal:report.invoice_records.length,
    transferTotal:report.transfer_records.length,
    flaggedInvoices: report.invoice_records.filter(x=>x.status !== 'candidate_exact_amount_only').length,
    flaggedTransfers: report.transfer_records.filter(x=>x.status !== 'candidate_attributed_unverified').length,
    headline:'UNVERIFIED CSV candidates — zero actual chain receipts or buyer payments proven.',
    actions:'Verify real Base8453 transaction receipt and exact canonical Circle USDC Transfer log from an authorized trusted source; check finality, recipient ownership and written invoice attribution separately. Do not deliver goods, book revenue, request repeated payment or refund from this preview alone.',
  };
}
