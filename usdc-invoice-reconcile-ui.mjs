import {
  reconcileUsdcCsv, fictionalInvoices, fictionalTransfers, INPUT_LIMIT
} from './usdc-invoice-reconcile-core.mjs';
const $ = id => document.getElementById(id);
let report = null;
function show(s) { $('recon-output').textContent = s; }
function resetReport() { report = null; $('recon-download').disabled = true; }
function addFileHandler(id, output) {
  $(id).addEventListener('change', async event => {
    resetReport();
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > INPUT_LIMIT) { show('File exceeds the 256 KiB input cap and was not read.'); return; }
    try {
      $(output).value = await file.text();
      show('Local file read into this browser. No upload was made. Click Preview.');
    } catch { show('Could not read this file locally.'); }
  });
}
addFileHandler('recon-invoices-file', 'recon-invoices');
addFileHandler('recon-transfers-file', 'recon-transfers');
$('recon-demo').addEventListener('click', () => {
  resetReport();
  $('recon-invoices-file').value = '';
  $('recon-transfers-file').value = '';
  $('recon-invoices').value = fictionalInvoices;
  $('recon-transfers').value = fictionalTransfers;
  show('Entirely synthetic demonstration loaded. Click Preview locally.');
});
$('recon-clear').addEventListener('click', () => {
  resetReport();
  $('recon-invoices-file').value = ''; $('recon-transfers-file').value = '';
  $('recon-invoices').value = ''; $('recon-transfers').value = '';
  show('No report yet. No data stored.');
});
$('recon-run').addEventListener('click', () => {
  resetReport();
  try {
    report = reconcileUsdcCsv($('recon-invoices').value,$('recon-transfers').value);
    show('UNVERIFIED local CSV candidate report (NOT proof of chain receipt or completed payment):\n\n' +
      JSON.stringify(report,null,2));
    $('recon-download').disabled = false;
  } catch(e) { show('No report. CSV input error: ' + (e?.message || 'Unsupported input')); }
});
$('recon-download').addEventListener('click',()=>{
  if (!report) return;
  const objectURL = URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=objectURL;a.download='unverified-usdc-invoice-local-row-report.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(objectURL),250);
});
