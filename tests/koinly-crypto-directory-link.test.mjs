import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const p = readFileSync(new URL('../koinly-column-mapper.html', import.meta.url), 'utf8');
test('candidate Koinly mapping tool is visible and free, without claiming official certification', () => {
  assert.match(p, /Your exchange CSV rejected by Koinly/);
  assert.match(p, /No independent paid buyer, no Koinly tax\/accounting certification, no wallet access/);
});
test('public directory reciprocating link is visible, external and safe', () => {
  assert.match(p, /<a href="https:\/\/polymart\.app\/crypto" target="_blank" rel="noopener noreferrer">Independent crypto tools directory ↗<\/a>/);
  assert.match(p, /external; no affiliation or review endorsement/);
});
test('CSV remains local only and can be reviewed before any paid work', () => {
  assert.match(p, /connect-src 'none'/);
  assert.match(p, /contact\.html\?service=koinly-mini-5/);
  assert.match(p, /Zero known outside paid conversion customers/);
});
