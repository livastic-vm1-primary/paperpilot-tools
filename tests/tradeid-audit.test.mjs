import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectTradeCsv, MAX_BYTES } from '../tradeid-audit-core.mjs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const base = [
  'Trade ID,Date,Asset,Amount,Note',
  'A1,2026-10-01,USDC,100,one',
  'A2,2026-10-01,USDC,100,two',
  'B1,2026-10-02,ETH,0.1,leg',
  'B1,2026-10-02,ETH,0.1,leg',
  'B1,2026-10-02,ETH,0.1,distinct fee',
  ',2026-10-02,ETH,0.1,unknown'
].join('\r\n');
test('separate real trade IDs with the same quantity are not flagged as duplicate IDs', () => {
  const x = inspectTradeCsv('Trade ID,Asset,Amount\nT1,ETH,1\nT2,ETH,1');
  assert.equal(x.sameQuantityDifferentIdGroups, 1);
  assert.equal(x.repeatedIdentifierGroups, 0);
  assert.equal(x.exactDuplicateGroups, 0);
});
test('fictional demo counts distinct ID collisions and exact repeated rows correctly', () => {
  const x = inspectTradeCsv(base);
  assert.equal(x.rowCount, 6);
  assert.equal(x.missingIdentifiers, 1);
  assert.equal(x.repeatedIdentifierGroups, 1);
  assert.equal(x.repeatedIdentifierExtraRows, 2);
  assert.equal(x.exactDuplicateGroups, 1);
  assert.equal(x.exactDuplicateExtraRows, 1);
  assert.equal(x.differingRowsSameIdentifierGroups, 1);
  assert.equal(x.sameQuantityDifferentIdGroups, 1);
  assert.deepEqual(x.sampleRowNumbers.exact, [[4, 5]]);
});
test('ID comparison preserves case and whole identifier not only numeric quantity', () => {
  const x = inspectTradeCsv('Trade ID,Amount\nT1,1\nt1,1\nT10,1');
  assert.equal(x.repeatedIdentifierGroups, 0);
  assert.equal(x.sameQuantityDifferentIdGroups, 1);
});
test('BOM CRLF quoted comma embedded newline and doubled quotes parse correctly', () => {
  const x = inspectTradeCsv('\uFEFF"Trade ID","Amount","Note"\r\nid-1,2,"has, commas"\r\nid-2,2,"multiline\nand ""quotes"""');
  assert.equal(x.rowCount, 2);
  assert.equal(x.columnCount, 3);
  assert.equal(x.sameQuantityDifferentIdGroups, 1);
});
test('order ID is not assumed to be unique fill ID', () => {
  const x = inspectTradeCsv('Order ID,Amount\norder1,1\norder1,2');
  assert.equal(x.identifierType, 'order');
  assert.equal(x.repeatedIdentifierGroups, 1);
  assert.match(x.disclaimer, /legitimate fills/);
});
test('trade ID wins over order ID when both exist', () => {
  const x = inspectTradeCsv('Order Id,Trade Id,Amount\no1,f1,1\no1,f2,2');
  assert.equal(x.identifierType, 'trade');
  assert.equal(x.repeatedIdentifierGroups, 0);
});
test('execution ID and transaction ID are supported', () => {
  assert.equal(inspectTradeCsv('Execution ID,Qty\n1,2').identifierType, 'execution');
  assert.equal(inspectTradeCsv('TxID,Amount\n1,2').identifierType, 'transaction');
});
test('no stable identifier fails closed before amount-only guesses', () => {
  assert.throws(() => inspectTradeCsv('Amount,Asset\n1,USDC\n1,USDC'), /stable IDs|identifier|ID header/i);
});
test('malformed unclosed quote fails closed', () => {
  assert.throws(() => inspectTradeCsv('Trade ID,Amount\nA1,"incomplete'), /Unclosed/);
});
test('malformed quote after unquoted text fails closed', () => {
  assert.throws(() => inspectTradeCsv('Trade ID,Amount\nA1,xy"bad'), /Unescaped/);
});
test('stray content after closed quote fails closed', () => {
  assert.throws(() => inspectTradeCsv('Trade ID,Amount\nA1,"3"bad'), /Unexpected/);
});
test('empty data and missing header fail closed', () => {
  assert.throws(() => inspectTradeCsv('   '), /non-empty/);
  assert.throws(() => inspectTradeCsv('Trade ID,Amount'), /at least one/);
});
test('invalid control and replacement characters fail closed', () => {
  assert.throws(() => inspectTradeCsv('Trade ID,Amount\nA1,1\u0000'), /unsupported/);
  assert.throws(() => inspectTradeCsv('Trade ID,Amount\nA1,\ufffd'), /unsupported/);
});
test('size and record limits reject oversized records before analysis', () => {
  assert.throws(() => inspectTradeCsv('Trade ID,Amount\nA1,' + 'a'.repeat(MAX_BYTES)), /256 KiB/);
  const many = ['Trade ID,Amount', ...Array.from({length: 751}, (_, i) => 'id' + i + ',1')].join('\n');
  assert.throws(() => inspectTradeCsv(many), /750/);
});
test('ragged rows cause warnings not fabricated equality', () => {
  const x = inspectTradeCsv('Trade ID,Amount,Asset\nA1,1,ETH\nA2,1');
  assert.equal(x.raggedRows, 1);
  assert.equal(x.sameQuantityDifferentIdGroups, 0);
});
test('different asset names with same amount are not grouped together', () => {
  const x = inspectTradeCsv('Trade ID,Amount,Asset\nA1,1,ETH\nA2,1,USDC');
  assert.equal(x.sameQuantityDifferentIdGroups, 0);
});
test('result includes row numbers but never raw identifiers/amounts/memo', () => {
  const input = 'Trade ID,Amount,Note\nPRIVATE_ID_ABC,123456.789,Secret personal memo\nPRIVATE_ID_ABC,123456.789,Secret personal memo';
  const x = inspectTradeCsv(input);
  const output = JSON.stringify(x);
  for (const item of ['PRIVATE_ID_ABC', '123456.789', 'Secret personal memo']) assert.equal(output.includes(item), false, item);
  assert.deepEqual(x.sampleRowNumbers.repeatedIds, [[2, 3]]);
});
test('browser interface is same-origin, CSP network blocked and refuses automatic wallets', () => {
  const html = read('../tradeid-audit.html');
  const ui = read('../tradeid-audit-ui.mjs');
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /id="trade-run"/);
  assert.match(html, /id="trade-file"/);
  assert.match(html, /script type="module" src="tradeid-audit-ui.mjs"/);
  assert.doesNotMatch(ui, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|ethereum\.request|window\.open/);
  assert.match(ui, /JSON.stringify\(state.report/);
});
test('public discovery offers functional audit and optional separately-agreed scope without claim of a sale', () => {
  const html = read('../tradeid-audit.html');
  const def = read('../defi-exception-inbox.html');
  const siteMap = read('../sitemap.xml');
  const llm = read('../llms.txt');
  const catalog = JSON.parse(read('../catalog.json'));
  assert.match(html, /No immediate checkout or purchased service exists/);
  assert.match(html, /defi-exception-inbox\.html#feedback/);
  assert.match(html, /explicit third-party consent/);
  assert.match(def, /tradeid-audit\.html/);
  assert.match(siteMap, /tradeid-audit\.html/);
  assert.match(llm, /tradeid-audit\.html/);
  assert.ok(catalog.offers.some(o => o.id === 'free-trade-id-csv-duplicate-audit' && o.price_usdc === '0.000000'));
});
