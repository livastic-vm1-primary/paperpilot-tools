import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const page=readFileSync(root+'defi-exception-inbox.html','utf8');
function block(id,next){const start=page.indexOf('id="'+id+'"');if(start<0)throw Error('Missing '+id);const end=page.indexOf(next,start);return page.slice(start,end<0?undefined:end);}
test('original one-owner three existing different free tools are correctly routed',()=>{
 const vm3=page.indexOf('id="two-csv-kraken-bridge"');
 const vm5=page.indexOf('id="usdc-invoice-checker"');
 assert.ok(vm3>0&&vm5>vm3);
 const a=block('two-csv-kraken-bridge','id="usdc-invoice-checker"');
 assert.match(a,/livastic-vm3-primary-tmp-260920.github.io\/defi-payment-proof-qa\/guides\/crypto-transfer-csv-pair-auditor\.html/);
 const b=block('usdc-invoice-checker','id="pilot"');
 assert.match(b,/livastic-vm5-primary-20260911.github.io\/vm5-delivery-lab\/usdc-invoice-bridge\//);
 assert.match(b,/under ONE economic owner/);
});
test('invoice tool is explicitly not a real onchain receipt verifier or a tax app',()=>{
 const s=block('usdc-invoice-checker','id="pilot"');
 for(const word of ['self-reported Base USDC transfer CSV','processed <strong>locally','not independently checked onchain','not instant wallet checkout'])
 assert.ok(s.includes(word),word);
 assert.match(s,/zero independently confirmed customers/);
});
test('invoice/receipt schema expectations mirror live original VM5 terms',()=>{
 const s=block('usdc-invoice-checker','id="pilot"');
 assert.match(s,/invoice_id,recipient,amount_usdc,chain,token/);
 assert.match(s,/invoice_id,tx_hash,log_index,recipient,amount_usdc,chain,token,status/);
 assert.match(s,/generic BaseScan, Kraken or wallet export/);
 assert.match(s,/49 native Base USDC/);
});
test('no new pay button, owner-wallet signer, form data upload or invented paid engagement',()=>{
 const s=block('usdc-invoice-checker','id="pilot"');
 assert.doesNotMatch(s,/type="submit"|<form|eth_sendTransaction|requestAccounts|walletConnect|window\.ethereum/);
 assert.match(s,/written agreement/);
 assert.doesNotMatch(s,/paid verified|guaranteed finality/);
});
