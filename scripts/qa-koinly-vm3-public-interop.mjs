/**
 * INDEPENDENT external-sibling Koinly structural-checker interoperability QA.
 * Accepts one ALREADY downloaded, personally inspected original VM3 public
 * core.mjs. Never downloads remote JS, never reads a customer's CSV, never
 * sends network requests or wallets. The SHA pin prevents executing unexpected
 * changes to public runtime code. Not part of regular offline Node CI suite.
 *
 * Peer source: https://livastic-vm3-primary-tmp-260920.github.io/crypto-csv-rescue/koinly-preflight/core.mjs
 * Snapshot SHA256 documented and originally actually retrieved Oct21 2026.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {
  buildKoinlyCsv,demoExchangeCsv,demoMapping
} from '../koinly-column-mapper-core.mjs';

const EXPECTED_SHA256 = '93460f9d227e3934d22f547e9d44540a7f03ad62968d86d51678555df6930fcf';
const filename=process.argv[2];
if(!filename) {
  console.error('Supply exactly one previously independently verified, locally staged original VM3 public core.mjs file.');
  process.exit(2);
}
const source=fs.readFileSync(filename);
assert.equal(createHash('sha256').update(source).digest('hex'),EXPECTED_SHA256,
  'VM3 source SHA has changed. Inspect vendor/peer code before running any new version; never silently execute replacement code.');
const { inspectCsv } = await import(pathToFileURL(path.resolve(filename)).href);
assert.equal(typeof inspectCsv,'function');

const cases=[
  {
    name:'universal-three-fictional-rows',
    template:'universal',
    input:demoExchangeCsv,
    mapping:demoMapping
  },
  {
    name:'simple-one-fictional-withdrawal',
    template:'simple',
    input:'utc,amount,currency,note\n2026-10-20 10:00:00,-1.25,USDC,synthetic',
    mapping:{'Koinly Date':'utc',Amount:'amount',Currency:'currency'}
  },
  {
    name:'trades-one-fictional-buy',
    template:'trades',
    input:'utc,pair,side,amount,total,tradeid\n2026-10-20 10:00:00,ETH/USDC,Buy,1,2500,FAKETRADE101',
    mapping:{'Koinly Date':'utc',Pair:'pair',Side:'side',Amount:'amount',Total:'total','Trade ID':'tradeid'}
  }
];
const results=[];
for(const c of cases){
  const mapped=buildKoinlyCsv(c.input,{template:c.template,mapping:c.mapping,confirmedUtc:true});
  assert.equal(mapped.ok,true);
  const peer=inspectCsv(mapped.csv,c.template);
  assert.equal(peer.structurallyReady,true,c.name);
  assert.equal(peer.errors,0,c.name);
  assert.equal(peer.warnings,0,c.name);
  assert.equal(peer.dataRowCount,mapped.report.sourceRows);
  results.push({name:c.name,mapperRows:mapped.report.outputRows,VM3Errors:peer.errors,VM3Warnings:peer.warnings});
}
const simpleMap={template:'simple',mapping:{'Koinly Date':'utc',Amount:'amount',Currency:'currency'},confirmedUtc:true};
const longAmount='utc,amount,currency,note\n2026-10-20 10:00:00,0.123456789012345678901,ETH,synthetic';
const tooManyDecimal=buildKoinlyCsv(longAmount,simpleMap);
assert.equal(tooManyDecimal.ok,true);
assert.ok(tooManyDecimal.report.vm3PublicPreflightKnownInputLimitWarnings.some(x=>x.includes('18 places')));
const peerDecimal=inspectCsv(tooManyDecimal.csv,'simple');
assert.equal(peerDecimal.structurallyReady,false);
assert.ok(peerDecimal.issues.some(x=>x.code==='INVALID_SIMPLE_SIGNED_AMOUNT'));
results.push({name:'21-place-decimal-warning-not-data-rewrite',siblingCode:'INVALID_SIMPLE_SIGNED_AMOUNT'});
const extras=Array.from({length:34},(_,i)=>'s'+i);
const source37=['utc','amount','currency',...extras].join(',')+'\n'+['2026-10-20 10:00:00','1.01','ETH',...extras.map(x=>'FAKE'+x)].join(',');
const overColumns=buildKoinlyCsv(source37,simpleMap);
assert.equal(overColumns.ok,true);
assert.ok(overColumns.report.vm3PublicPreflightKnownInputLimitWarnings.some(x=>x.includes('36')));
assert.throws(()=>inspectCsv(overColumns.csv,'simple'),e=>e.code==='TOO_MANY_COLUMNS');
results.push({name:'37-source-columns-warning-not-data-deletion',siblingCode:'TOO_MANY_COLUMNS'});
assert.equal(tooManyDecimal.report.vm3PublicPreflightActuallyRunOnUserFile,false);
assert.equal(overColumns.report.vm3PublicPreflightGuaranteesKoinlyImport,false);
assert.equal(results.length,5);
console.log(JSON.stringify({
  actualPeerSourceSha256:EXPECTED_SHA256,
  cases:results,
  networkRequests:0,
  realCustomerCsvAccess:false,
  KoinlyProductImportVerified:false,
  newPayingBuyers:0
},null,2));
