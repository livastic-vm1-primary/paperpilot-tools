import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../services.html', import.meta.url),'utf8');
const publicListing='https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/x402-base-usdc-agentkit-langchain-fixed-qa-5usdc.md';
test('published exact original HashN fixed-review link appears once',()=>{
  assert.equal(html.split(publicListing).length-1,1);
  assert.match(html,/Fixed-scope x402 Base USDC integration QA: 5 native Circle Base USDC per review/);
});
test('links original owner verified public LangChain and AgentKit sources once',()=>{
  for(const suffix of ['blockchainiq-langchain-x402-20261024','blockchainiq-agentkit-x402-20261024']){
    const u='https://github.com/livastic-vm1-primary/'+suffix;
    assert.equal(html.split(u).length-1,1);
  }
  assert.match(html,/LangChain tool \(45 passing tests\)/);
  assert.match(html,/Coinbase AgentKit ActionProvider \(48 passing tests\)/);
});
test('truthfully excludes automatic order, custodial access, paid customer assertions',()=>{
  assert.match(html,/no instant checkout, no actual custom QA customer\/order and no realized revenue from this new listing/i);
  assert.match(html,/individual written terms and independent original-owner payment verification/);
  assert.match(html,/Never put a wallet seed, authentication token or confidential client data in the first inquiry/);
  assert.match(html,/not an automated audit certificate, a paid API purchase, a resale of public code/);
});
test('preserves preexisting login-free manual quote path, prior ChainProof and Koinly offer',()=>{
  assert.match(html,/href="contact\.html\?service=qa"/);
  assert.match(html,/chainproof-agent-native-20261024/);
  assert.match(html,/koinly-csv-one-source-mapping-mini-review-5usdc/);
});
