import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../csv-quality-api.html',import.meta.url),'utf8');
const originalSkill = readFileSync(new URL('../.agents/skills/paperpilot-csv-preflight/SKILL.md', import.meta.url),'utf8');
test('live page offers verified directly installable free original skill, with pinned third party CLI',()=>{
  assert.match(html,/npm exec --package=skills@1\.5\.7 -- skills add livastic-vm1-primary\/paperpilot-tools --skill paperpilot-csv-preflight/);
  assert.match(originalSkill,/name: paperpilot-csv-preflight/);
  assert.doesNotMatch(html,/npx skills add livastic-vm1-primary\/paperpilot-tools/);
});
test('not falsely reporting catalog PR as accepted, and distinguishes name from direct slug',()=>{
  assert.match(html,/github\.com\/agentskillexchange\/skills\/pull\/122/);
  assert.match(html,/still-pending merge/);
  assert.match(html,/after the PR merges/);
  assert.match(html,/PR is not yet a published catalog listing/);
  assert.match(html,/"PaperPilot CSV Preflight"/);
});
test('public free install path never initiates a cryptocurrency payment or customer CSV upload',()=>{
  assert.match(html,/chargedUSDC:"0"/);
  assert.match(html,/networkRequests:0/);
  assert.match(html,/0\.005 native Base Circle USDC/);
  assert.match(html,/An independent buyer must choose and approve any paid call/);
  assert.match(html,/not.*an outside paid user/);
});
test('independent third-party review is not conflated with a paid sale or audit',()=>{
  assert.match(html,/24 checks without payment/);
  assert.match(html,/not.*independent security audit or installer endorsement/);
  assert.match(html,/separate paid product/);
});
