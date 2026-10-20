import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync, spawnSync} from "node:child_process";
const root=fileURLToPath(new URL("../",import.meta.url));
const skill=fileURLToPath(new URL("../.agents/skills/paperpilot-csv-preflight/",import.meta.url));
const cli=join(skill,"scripts","preflight.cjs");
const browserCode=readFileSync(join(root,"csv-local-preview.js"));
function run(args,input) {
 const p=spawnSync(process.execPath,[cli,...args],{input,encoding:"utf8",timeout:4000,maxBuffer:8192,env:{PATH:process.env.PATH}});
 assert.equal(p.error,undefined);
 return {status:p.status,out:JSON.parse(p.stdout),stderr:p.stderr};
}
test("skill uses one exact source implementation, not a shadow parser",()=>{
 assert.deepEqual(readFileSync(join(skill,"scripts","csv-local-preview.cjs")),browserCode);
});
test("skill has valid frontmatter and clearly distinguishes optional priced x402",()=>{
 const s=readFileSync(join(skill,"SKILL.md"),"utf8");
 assert.match(s,/^---\nname: paperpilot-csv-preflight\ndescription: /);
 assert.match(s,/Never make a paid request automatically/);
 assert.match(s,/0\.005 native Circle USDC on Base mainnet/);
 assert.match(s,/not a payment or a successful report/);
});
test("fictional sample reports actual original counterexample, no raw data or charge",()=>{
 const {status,out,stderr}=run(["--demo"]);
 assert.equal(status,0); assert.equal(stderr,"");
 assert.deepEqual([out.dataRows,out.columns,out.missingCells,out.raggedRows,out.duplicateRows,out.formulaWarnings],[5,3,3,1,1,1]);
 assert.equal(out.networkRequests,0);assert.equal(out.chargedUSDC,"0");
 assert.doesNotMatch(JSON.stringify(out),/HYPERLINK|Ada|Bob|example\.invalid/);
});
test("UTF-8 quoted CSV piped on stdin produces clean result",()=>{
 const {status,out}=run(["--stdin"],'id,name\r\n1,"Ada, L"\r\n2,Lee\r\n');
 assert.equal(status,0);assert.equal(out.ok,true);assert.equal(out.dataRows,2);assert.equal(out.raggedRows,0);
});
test("unbalanced quotes fail without echoing the CSV",()=>{
 const {status,out}=run(["--stdin"],'email,name\n"unclosed:SECRET123');
 assert.equal(status,2);assert.equal(out.ok,false);assert.doesNotMatch(JSON.stringify(out),/SECRET123/);
});
test("oversize Unicode blocked by bytes before local parse",()=>{
 const {status,out}=run(["--stdin"],'id\n'+'가'.repeat(11000));
 assert.equal(status,2);assert.match(out.error,/32 KiB/);
});
test("invalid UTF-8 bytes fail, never silently replace",()=>{
 const p=spawnSync(process.execPath,[cli,"--stdin"],{input:Buffer.from([0x69,0x64,0x0a,0xff,0xfd]),timeout:4000,encoding:"utf8"});
 assert.equal(p.status,2);assert.match(p.stdout,/not valid UTF-8/);
});
test("file input and help are dependency free",()=>{
 const dir=mkdtempSync(join(tmpdir(),"paperpilot-skill-test-"));
 try {
  const f=join(dir,"synthetic.csv");
  writeFileSync(f,"id,name\n1,Ada\n");
  const {status,out}=run(["--file",f]);
  assert.equal(status,0);assert.equal(out.dataRows,1);
  assert.doesNotMatch(JSON.stringify(out),/\.csv|Ada/);
  const help=execFileSync(process.execPath,[cli,"--help"],{encoding:"utf8"});
  assert.match(help,/offline heuristic/);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test("no network, key, environment, signer, telemetry, or writes in executable CLI",()=>{
 const src=readFileSync(cli,"utf8");
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|node:https|node:http|writeFile|process\.env|sendBeacon|signMessage|\bnpm\s+install\b/i);
});
test("stray arguments cannot become paid actions",()=>{
 const {status,out}=run(["--pay","--demo"]);
 assert.equal(status,2);assert.equal(out.chargedUSDC,"0");assert.equal(out.networkRequests,0);
});
test("site/catalog/agent guide exposes this free skill without imaginary paid orders",()=>{
 const json=JSON.parse(readFileSync(join(root,"catalog.json"),"utf8"));
 const item=json.offers.find(x=>x.id==="agent-skill-free-csv-preflight");
 assert.equal(item.price_usdc,"0.000000");assert.equal(item.max_input_utf8_bytes,32768);
 assert.equal(item.no_network_no_storage_no_wallet,true);
 assert.equal(json.offers.find(x=>x.id==="vm5-x402-csv-preflight").verified_paid_post_customers,0);
 const html=readFileSync(join(root,"csv-quality-api.html"),"utf8");
 assert.match(html,/id="agent-skill"/);
 assert.match(html,/Free checks never access the network or a wallet/);
 assert.match(html,/does not authorize, sign, send a payment or upload anything/);
 const llms=readFileSync(join(root,"llms.txt"),"utf8");
 assert.match(llms,/zero-charge CSV preflight agent skill/);
});
