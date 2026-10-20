import {
  reconcileUsdcCsv, fictionalInvoices, fictionalTransfers, INPUT_LIMIT
} from './usdc-invoice-reconcile-core.mjs';
import { summarizeUnverifiedReport } from './usdc-invoice-reconcile-summary.mjs';
const $ = id => document.getElementById(id);
let report = null;
function show(s) { $('recon-output').textContent = s; }
function resetReport() {
  report = null;
  $('recon-download').disabled = true;
  $('recon-summary').replaceChildren();
  $('recon-summary').hidden = true;
}
function node(tag, text, parent, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = String(text);
  parent.append(el);
  return el;
}
function appendSummaryTable(parent, title, columns, rows, total) {
  node('h3',title,parent);
  node('p','Showing '+rows.length+' of '+total+' rows; the full local JSON is available below.',parent,'recon-bound');
  const container=node('div',undefined,parent,'recon-tables');
  const table=node('table',undefined,container);
  const thead=node('thead',undefined,table);
  const tr=node('tr',undefined,thead);
  for (const [heading] of columns) node('th',heading,tr);
  const tbody=node('tbody',undefined,table);
  for(const row of rows) {
    const rowEl=node('tr',undefined,tbody);
    for(const [,field] of columns) node('td',row[field],rowEl);
  }
}
function renderSummary(data) {
  const summary=summarizeUnverifiedReport(data);
  const root=$('recon-summary');
  root.replaceChildren();
  root.hidden=false;
  node('h3','Exception summary (from claimed CSV text only)',root);
  node('p',summary.headline,root,'recon-headline');
  const metrics=node('div',undefined,root,'recon-metrics');
  for(const [label,count] of [
    ['Invoice rows in input',summary.invoiceTotal],
    ['Invoice rows needing review',summary.flaggedInvoices],
    ['Transfer rows in input',summary.transferTotal],
    ['Transfer rows needing review',summary.flaggedTransfers]
  ]) {
    const box=node('p',undefined,metrics);
    node('strong',count,box);
    node('span',label,box);
  }
  appendSummaryTable(root,'Invoice rows',[
    ['Row','row'],['Unverified classification','status'],['Claimed allocation','claimed'],
    ['Claimed shortfall','shortfall'],['Next check','nextStep']
  ],summary.invoices,summary.invoiceTotal);
  appendSummaryTable(root,'Transfer rows',[
    ['Row','row'],['Unverified classification','status'],['Next check','nextStep']
  ],summary.transfers,summary.transferTotal);
  node('p',summary.actions,root,'recon-headline');
}

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
    renderSummary(report);
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
