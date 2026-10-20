import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {test} from "node:test";
const require = createRequire(import.meta.url);
const {parseCsv, inspectCsv, MAX_BYTES} = require("../csv-local-preview.js");

test("quoted commas, escaped quotes, embedded newline and CRLF", () => {
  assert.deepEqual(parseCsv('a,b\r\n"first, part","hi ""again"""\r\n"two\nlines",2\r\n'), [
    ["a","b"], ["first, part",'hi "again"'], ["two\nlines","2"]
  ]);
});
test("normal CSV leaves zero issues", () => {
  const r=inspectCsv("id,name\n1,Ada\n2,Lee\n");
  assert.equal(r.ok, true);
  assert.equal(r.dataRows, 2);
  assert.equal(r.columns, 2);
  for (const x of ["raggedRows","missingCells","duplicateRows","duplicateHeaders","blankHeaders","formulaWarnings"])
    assert.equal(r[x], 0);
});
test("realistic CSV anomalies counted once", () => {
  const r=inspectCsv('id,ID,name\n1,1,Ada\n2,2,\n2,2,\n3,=HYPERLINK("https://fake.invalid","x"),5,extra\n');
  assert.equal(r.ok, false); // valid escaping required on comma-containing formula
  const v=inspectCsv('id,ID,name\n1,1,Ada\n2,2,\n2,2,\n3,"=HYPERLINK(""https://fake.invalid"", ""x"")",5,extra\n');
  assert.equal(v.ok, true);
  assert.equal(v.duplicateHeaders, 1);
  assert.equal(v.duplicateRows, 1);
  assert.equal(v.missingCells, 2);
  assert.equal(v.raggedRows, 1);
  assert.equal(v.formulaWarnings, 1);
});
test("reject oversized non-ascii UTF8 bytes", () => {
  assert.equal(inspectCsv("h\n" + "가".repeat(MAX_BYTES / 2)).ok, false);
});
test("reject unbalanced or misplaced quotes", () => {
  for (const csv of ['a\n"open', 'a\nb"ad', 'a\n"ok"x']) assert.equal(inspectCsv(csv).ok, false);
});
test("empty inputs and BOM recognized", () => {
  assert.equal(inspectCsv(" \n ").ok, false);
  assert.equal(inspectCsv("\uFEFFid,name\n1,Ada").dataRows, 1);
});
test("unsafe formulas counted but numeric minus is not", () => {
  const r=inspectCsv("id,data\n1,=CMD\n2,+SUM\n3,@DDE\n4,-HYPERLINK\n5,-100\n");
  assert.equal(r.formulaWarnings, 4);
});
test("public HTML includes local data disclosure, no paid auto-call", () => {
  const html=readFileSync(new URL("../csv-quality-api.html",import.meta.url),"utf8");
  assert.match(html,/id="csv-preview-input"/);
  assert.match(html,/csv-local-preview.js/);
  assert.match(html,/processed only in this browser/);
  assert.match(html,/does not initiate a paid request/);
  const js=readFileSync(new URL("../csv-local-preview.js",import.meta.url),"utf8");
  assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
});
