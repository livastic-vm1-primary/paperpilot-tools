import { inspectTradeCsv, MAX_BYTES } from './tradeid-audit-core.mjs';
const byId = id => document.getElementById(id);
const state = { report: null };
const demo = [
  'Trade ID,Date,Asset,Amount,Note',
  'T-001,2026-10-01,USDC,100,first fill',
  'T-002,2026-10-01,USDC,100,second distinct fill',
  'T-003,2026-10-02,ETH,0.5,original',
  'T-003,2026-10-02,ETH,0.5,original',
  'T-003,2026-10-02,ETH,0.5,fee or ledger leg to review',
  ',2026-10-02,ETH,0.1,no ID'
].join('\r\n');
function setResult(message) { byId('trade-result').textContent = message; }
function line(label, val) { return label + ': ' + val; }
function render(r) {
  return [
    'CSV reviewed locally. No rows, IDs, amounts or wallet keys are sent or echoed.',
    line('Data rows', r.rowCount), line('Identifier type', r.identifierType),
    line('Missing identifiers', r.missingIdentifiers), line('Ragged rows', r.raggedRows),
    line('Repeated identifier groups', r.repeatedIdentifierGroups),
    line('Groups reusing one identifier with different row data', r.differingRowsSameIdentifierGroups),
    line('Exact repeated-row groups', r.exactDuplicateGroups),
    line('Equal-amount groups with DIFFERENT identifiers (not duplicates)', r.sameQuantityDifferentIdGroups),
    '',
    'Rows to inspect (numbers include header row 1; at most 40 groups per category):',
    line('Repeated IDs', JSON.stringify(r.sampleRowNumbers.repeatedIds)),
    line('Same ID, differing details', JSON.stringify(r.sampleRowNumbers.varyingRowsSameId)),
    line('Exact duplicates', JSON.stringify(r.sampleRowNumbers.exact)),
    line('Same amount, distinct IDs', JSON.stringify(r.sampleRowNumbers.quantityCollision)),
    '',
    r.disclaimer
  ].join('\n');
}
byId('trade-demo').addEventListener('click', () => {
  byId('trade-input').value = demo; byId('trade-file').value = '';
  state.report = null; byId('trade-save').disabled = true;
  setResult('Fictional demo loaded. Click “Audit locally”.');
});
byId('trade-clear').addEventListener('click', () => {
  byId('trade-input').value = ''; byId('trade-file').value = '';
  state.report = null; byId('trade-save').disabled = true; setResult('No report yet.');
});
byId('trade-file').addEventListener('change', async (event) => {
  state.report = null; byId('trade-save').disabled = true;
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > MAX_BYTES) { setResult('File exceeds 256 KiB. It was not read.'); return; }
  try { byId('trade-input').value = await file.text(); setResult('Selected file read locally. Click “Audit locally”.'); }
  catch { setResult('Cannot read the file locally.'); }
});
byId('trade-run').addEventListener('click', () => {
  try {
    state.report = inspectTradeCsv(byId('trade-input').value);
    setResult(render(state.report));
    byId('trade-save').disabled = false;
  } catch (err) {
    state.report = null; byId('trade-save').disabled = true;
    setResult('Cannot audit this CSV: ' + (err?.message || 'Invalid CSV input.'));
  }
});
byId('trade-save').addEventListener('click', () => {
  if (!state.report) return;
  const report = new Blob([JSON.stringify(state.report, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(report);
  const link = document.createElement('a');
  link.href = objectUrl; link.download = 'trade-id-row-number-audit.json';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 500);
});
