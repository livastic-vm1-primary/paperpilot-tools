import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseExchangeCsv,buildKoinlyCsv,demoExchangeCsv,demoMapping} from '../koinly-column-mapper-core.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('local-only Koinly mapper content-security policy disables all network fetches and automatic forms',()=>{
  const html=read('koinly-column-mapper.html');
  const ui=read('koinly-column-mapper-ui.mjs');
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/script-src 'self'/);
  assert.match(html,/script type="module" src="koinly-column-mapper-ui.mjs"/);
  assert.match(html,/koinly-column-mapper-core.mjs/);
  assert.match(html,/not a crypto tax filing or a Koinly import guarantee/);
  assert.match(html,/49 USD/);
  for(const id of ['input-file','csv-original','input-demo','input-inspect','input-clear','koinly-format',
    'mapping-fields','utc-confirm','input-preview','output-download','mapper-message','mapping-results']){
    assert.ok(html.includes('id="'+id+'"'),'missing element '+id);
  }
  assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|window\.ethereum|web3|localStorage|sessionStorage|navigator\.clipboard|innerHTML|outerHTML/);
  assert.match(ui,/\.textContent/);
  assert.match(ui,/URL\.revokeObjectURL/);
  assert.match(ui,/new Blob/);
  assert.match(html,/NO TOKEN, LOGIN OR WALLET NEEDED/);
});
test('one real economic owner commercial CTA and complementary preflight are disclosed',()=>{
  const html=read('koinly-column-mapper.html');
  assert.match(html,/VM3 Koinly CSV preflight/);
  assert.match(html,/not affiliated with or endorsed by Koinly/);
  assert.match(html,/external paying-customer count verified for this tool is zero/i);
  assert.match(html,/49 USD/);
  assert.match(html,/refund terms/);
  assert.match(html,/crypto-csv-rescue\.html/);
});
test('parent priority real buyer page exposes free mapper, old manual USDC inquiry intact',()=>{
  const parent=read('crypto-csv-rescue.html');
  assert.match(parent,/href="koinly-column-mapper\.html"/);
  assert.match(parent,/Email about a 50-row pilot scope \(draft only\)/);
  assert.match(parent,/No independent customer order or purchase of this service has been verified/);
  assert.ok(parent.indexOf('href="koinly-column-mapper.html"')>parent.indexOf('<main'));
  assert.match(read('index.html'),/href="koinly-column-mapper\.html"/);
  assert.match(read('sitemap.xml'),/koinly-column-mapper\.html/);
});
test('catalog and AI discovery tell the truth about limits, data use and no independent customer',()=>{
  const j=JSON.parse(read('catalog.json'));
  const p=j.offers.find(x=>x.id==='free-manual-koinly-header-mapper');
  assert.equal(p.price_usdc,'0.000000');
  assert.equal(p.no_server_upload,true);
  assert.equal(p.generated_Koinly_import_acceptance_verified,false);
  assert.equal(p.real_outside_paying_customers_verified,0);
  assert.equal(p.source_rows_automatically_deleted_or_merged,false);
  assert.equal(p.source_financial_values_automatically_edited,false);
  assert.ok(p.complementary_same_owner_VM3_preflight.includes('/koinly-preflight/'));
  assert.match(read('llms.txt'),/Free local-only manual Koinly column mapper/);
  assert.match(read('README.md'),/Free manual exchange CSV to official Koinly column mapper/);
});
test('committed fictional source and candidate fixture round trip exactly same 3 rows and every input cell',()=>{
  const src=read('examples/koinly-column-mapper/fictional-exchange-export.csv');
  const expected=read('examples/koinly-column-mapper/fictional-koinly-universal-candidate.csv');
  const generated=buildKoinlyCsv(src,{template:'universal',mapping:demoMapping,confirmedUtc:true});
  assert.equal(generated.ok,true);
  assert.equal(generated.csv.replaceAll('\r\n','\n'),expected);
  const original=parseExchangeCsv(src), candidate=parseExchangeCsv(expected);
  assert.equal(original.rowCount,3);
  assert.equal(candidate.rowCount,3);
  assert.equal(candidate.headers.at(-1),'Source: execution_ref');
  for(let i=0;i<original.rowCount;i++){
    assert.deepEqual(candidate.records[i],[
      original.records[i][0],original.records[i][1],original.records[i][2],
      original.records[i][3],original.records[i][4],original.records[i][5],original.records[i][6]
    ]);
  }
  assert.equal(generated.report.outputRows,3);
  assert.equal(generated.report.issues.length,0);
});
