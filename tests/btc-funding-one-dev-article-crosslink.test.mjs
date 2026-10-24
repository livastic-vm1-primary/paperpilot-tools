import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dir=new URL('../',import.meta.url);
const article='https://dev.to/livasticvm1primary/four-btcusdt-funding-quotes-four-clocks-a-free-offline-comparison-checker-3fl1';
const guide=readFileSync(new URL('btc-funding-x402-data.html',dir),'utf8');
const llms=readFileSync(new URL('llms.txt',dir),'utf8');
test('one exact original source article link on static paid merchant buyer guide',()=>{
  assert.equal(guide.split(article).length-1,1);
  assert.equal(llms.split(article).length-1,1);
  assert.match(guide,/uses four fabricated rates/);
});
test('no user wallet, spontaneous payment or unverified repeat buyers claimed by cross-link',()=>{
  assert.match(guide,/does not estimate current exchange rates, APR or profitability/);
  assert.match(llms,/not recurring customer revenue/);
  assert.match(guide,/one marketplace-operated verification purchase/);
});
