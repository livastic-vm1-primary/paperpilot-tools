/**
 * Original, local-only structural trade-ID CSV audit.
 * Deliberately does not infer tax categories, cost basis, or true duplication.
 */
export const MAX_BYTES = 262144;
export const MAX_RECORDS = 750;

function parseCSV(text) {
  if (typeof text !== 'string' || !text.trim()) throw Error('Paste a non-empty CSV or select a file.');
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw Error('CSV is larger than the 256 KiB local-only limit.');
  if (text.includes('\u0000') || text.includes('\ufffd')) throw Error('CSV contains unsupported null or replacement characters.');
  const source = text.charCodeAt(0) === 65279 ? text.slice(1) : text;
  let rows = [], row = [], cell = '', state = 'normal';
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const isNewline = c === '\n' || c === '\r';
    if (state === 'quoted') {
      if (c === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') state = 'afterQuote';
      else cell += c;
    } else if (state === 'afterQuote') {
      if (c === ',') { row.push(cell); cell = ''; state = 'normal'; }
      else if (isNewline) {
        row.push(cell); rows.push(row); row = []; cell = ''; state = 'normal';
        if (c === '\r' && source[i + 1] === '\n') i++;
      } else throw Error('Unexpected content after a closing CSV quote.');
    } else if (c === '"') {
      if (cell.length > 0) throw Error('Unescaped quote in an unquoted CSV field.');
      state = 'quoted';
    } else if (c === ',') { row.push(cell); cell = ''; }
    else if (isNewline) {
      row.push(cell); rows.push(row); row = []; cell = '';
      if (c === '\r' && source[i + 1] === '\n') i++;
    } else cell += c;
    if (rows.length > MAX_RECORDS + 1) throw Error('CSV exceeds the 750 data-row limit.');
  }
  if (state === 'quoted') throw Error('Unclosed quoted CSV field.');
  if (row.length || cell.length || state === 'afterQuote') { row.push(cell); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every(v => !v.trim())) rows.pop();
  if (rows.length < 2) throw Error('CSV needs a header and at least one data row.');
  return rows;
}
const clean = s => String(s).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
function column(headers, options) {
  for (const key of options) {
    const i = headers.findIndex(h => h === key);
    if (i !== -1) return i;
  }
  return -1;
}

export function inspectTradeCsv(input) {
  const rows = parseCSV(input);
  const headers = rows.shift().map(clean);
  if (headers.length < 2 || headers.length > 60) throw Error('Expected 2–60 columns.');
  if (rows.length > MAX_RECORDS) throw Error('CSV exceeds the 750 data-row limit.');
  const ids = [
    [['tradeid','traderef','tradeidentifier'], 'trade'],
    [['fillid','executionid','executionref'], 'execution'],
    [['transactionid','transactionref','txid'], 'transaction'],
    [['orderid','orderref'], 'order']
  ];
  let idCol = -1, idKind = '';
  for (const [names, kind] of ids) {
    const match = column(headers, names);
    if (match >= 0) { idCol = match; idKind = kind; break; }
  }
  if (idCol < 0) throw Error('No trade, fill, execution, transaction, or order ID header found. Export stable IDs before checking duplicates; matching amounts alone is unsafe.');
  const amtCol = column(headers, ['amount','quantity','qty','size','volume','executedquantity','filledquantity']);
  const assetCol = column(headers, ['asset','currency','coin','symbol','ticker','baseasset']);
  const dateCol = column(headers, ['date','timestamp','datetime','time','createdat']);
  const idGroups = new Map(), rowGroups = new Map(), quantityGroups = new Map();
  let missingIds = 0, raggedRows = 0;
  for (let n = 0; n < rows.length; n++) {
    const row = rows[n], rowNum = n + 2;
    if (row.length !== headers.length) raggedRows++;
    const id = (row[idCol] ?? '').trim();
    if (!id) missingIds++;
    else {
      if (!idGroups.has(id)) idGroups.set(id, []);
      idGroups.get(id).push({row: rowNum, fingerprint: JSON.stringify(row)});
    }
    const fingerprint = JSON.stringify(row);
    if (!rowGroups.has(fingerprint)) rowGroups.set(fingerprint, []);
    rowGroups.get(fingerprint).push(rowNum);
    if (amtCol >= 0 && id && (row[amtCol] ?? '').trim()) {
      // This is a *possible* equality only. No rounding or floating arithmetic.
      const amountText = (row[amtCol] ?? '').trim();
      const assetText = assetCol >= 0 ? (row[assetCol] ?? '').trim().toUpperCase() : '(not provided)';
      const amountKey = JSON.stringify([assetText, amountText]);
      if (!quantityGroups.has(amountKey)) quantityGroups.set(amountKey, []);
      quantityGroups.get(amountKey).push({row: rowNum, id});
    }
  }
  const exactDuplicates = [...rowGroups.values()].filter(g => g.length > 1);
  const repeatingIds = [...idGroups.values()].filter(g => g.length > 1);
  const differingRowsSameId = repeatingIds.filter(g => new Set(g.map(x => x.fingerprint)).size > 1);
  const amountMatchesDistinctIds = [...quantityGroups.values()].filter(g => new Set(g.map(x => x.id)).size > 1);
  const sampleRows = groups => groups.slice(0, 40).map(g => g.map(x => typeof x === 'number' ? x : x.row).slice(0, 8));
  return Object.freeze({
    version: 1,
    rowCount: rows.length,
    columnCount: headers.length,
    identifierType: idKind,
    missingIdentifiers: missingIds,
    raggedRows,
    repeatedIdentifierGroups: repeatingIds.length,
    repeatedIdentifierExtraRows: repeatingIds.reduce((n, g) => n + g.length - 1, 0),
    differingRowsSameIdentifierGroups: differingRowsSameId.length,
    exactDuplicateGroups: exactDuplicates.length,
    exactDuplicateExtraRows: exactDuplicates.reduce((n, g) => n + g.length - 1, 0),
    sameQuantityDifferentIdGroups: amountMatchesDistinctIds.length,
    sampleRowNumbers: {
      repeatedIds: sampleRows(repeatingIds),
      varyingRowsSameId: sampleRows(differingRowsSameId),
      exact: sampleRows(exactDuplicates),
      quantityCollision: sampleRows(amountMatchesDistinctIds)
    },
    checks: {
      amountCompared: amtCol >= 0,
      currencyCompared: assetCol >= 0,
      timestampPresent: dateCol >= 0
    },
    disclaimer: 'These are review candidates, not proven duplicate economic transactions or tax classifications. Never delete rows by amount alone. Repeated order, transaction, or blockchain IDs can represent legitimate fills/ledger legs. Verify source records with the exchange or qualified adviser.'
  });
}
