import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../services.html',import.meta.url),'utf8');
const article='https://dev.to/livasticvm1primary/a-coinbase-agentkit-action-that-cannot-spend-usdc-by-default-48-tests-and-a-real-402-31fj';
const start=html.indexOf('<p id="x402-agent-review-5"');
const end=html.indexOf('</p>',start)+4;
const block=html.slice(start,end);
test('one new published firstparty DEV article link appears in exactly the matching five-USDC x402 QA offer',()=>{
  assert.ok(start>=0&&end>start);
  assert.equal(html.split(article).length-1,1);
  assert.equal(block.split(article).length-1,1);
  assert.match(block,/engineering case study \(48 offline tests, no paid transaction\)/);
});
test('link is a noncustodial, noncontractual educational example rather than a false paid endorsement',()=>{
  assert.match(block,/no instant checkout, no actual custom QA customer\/order and no realized revenue from this new listing/);
  assert.match(block,/individual written terms and independent original-owner payment verification/);
  assert.match(block,/rel="noopener noreferrer"/);
});
test('the same original paid product still has the right price, buyer form and hashN origin',()=>{
  assert.match(block,/5 native Circle Base USDC per review/);
  assert.match(block,/href="contact.html\?service=x402-agent-review-5"/);
  assert.match(block,/hashn.com\/store\/886ed287-aaca-434b-9f27-560a50bfbbb6\/listings\/x402-base-usdc-agentkit-langchain-fixed-qa-5usdc.md/);
});
