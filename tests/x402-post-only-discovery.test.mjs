import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const text=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const d=JSON.parse(text('../x402-post-discovery.json'));
const catalog=JSON.parse(text('../catalog.json'));
const ownerOffer=catalog.offers.find(x=>x.id==='vm5-x402-csv-preflight');
const html=text('../csv-quality-api.html');
const llm=text('../llms.txt');
const demo=d.free_buyer_safe_quote_probe;
test('one static POST-only manifest has an exact public merchant path and original spec',()=>{
 assert.equal(d.schema,'paperpilot-x402-post-only-merchant-probe-v1');
 assert.equal(d.buyer_offer.endpoint,'https://vm5-openapi-x402.onrender.com/v1/csv-preflight');
 assert.equal(d.buyer_offer.method,'POST');
 assert.equal(d.source_openapi_url,'https://vm5-openapi-x402.onrender.com/openapi.json');
 assert.equal(d.source_free_public_sample_url,'https://vm5-openapi-x402.onrender.com/v1/csv-sample');
 assert.equal(d.source_docs_url,'https://vm5-openapi-x402.onrender.com/v1/docs');
});
test('fee and chain/token/receiver exact, without claiming a wallet transaction happened',()=>{
 assert.equal(d.buyer_offer.price_native_circle_usdc,'0.005000');
 assert.equal(d.buyer_offer.chain_id,8453);
 assert.equal(d.buyer_offer.network,'eip155:8453');
 assert.equal(d.buyer_offer.asset.toLowerCase(),'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
 assert.equal(d.buyer_offer.receiver_pay_to.toLowerCase(),'0x6b01efa0705e91a7aca54271510bf9e594717f34');
 assert.equal(d.buyer_offer.actual_independent_paid_POST_buyers_confirmed,0);
 assert.equal(d.buyer_offer.paid_200_delivery_to_independent_buyer_verified,false);
});
test('public unsigned POST uses only synthetic data, no wallet or payment headers',()=>{
 assert.equal(demo.intent.includes('no payment authorized'),true);
 assert.equal(demo.request.method,'POST');
 assert.equal(demo.request.headers['Content-Type'],'application/json');
 assert.deepEqual(demo.request.json_body,{csvText:'id,name\n1,Ada\n2,Lin\n',expectedColumns:['id','name']});
 assert.equal(demo.request.url,d.buyer_offer.endpoint);
 assert.equal(demo.expected_http_status,402);
 assert.equal(demo.signature_or_wallet_required_to_get_402_quote,false);
 assert.equal(demo.free_quote_authorizes_spending,false);
 assert.equal(demo.auto_retry_or_payment_signature_in_probe,false);
 assert.equal(Object.keys(demo.request.headers).some(x=>/payment|authorization|cookie|api-key/i.test(x)),false);
});
test('expected quote clearly distinguishes atomic amount from decimal USDC',()=>{
 const accepts=demo.expected_quote_fields.accepts;
 assert.equal(demo.expected_quote_fields.x402Version,2);
 assert.equal(accepts.length,1);
 assert.equal(accepts[0].amount_atomic,'5000');
 assert.equal(accepts[0].usdc_decimals,6);
 assert.equal(accepts[0].network,'eip155:8453');
 assert.equal(accepts[0].payTo.toLowerCase(),d.buyer_offer.receiver_pay_to.toLowerCase());
});
test('machine-provided curl example is a readable safe POST with exactly the same JSON body',()=>{
 const command=d.public_reproduction;
 assert.match(command,/--max-redirs 0 -i -X POST/);
 assert.match(command,/--data-binary/);
 assert.doesNotMatch(command,/PAYMENT-SIGNATURE|Authorization:|--location|--retry|curl.*-u\s/);
 // The only shell parsing for the test's public local data: print argv to avoid running curl.
 const args=spawnSync('python3',['-c','import shlex,sys,json; print(json.dumps(shlex.split(sys.stdin.read())))'],{input:command,encoding:'utf8',timeout:2500});
 assert.equal(args.status,0,args.stderr);
 const argv=JSON.parse(args.stdout);
 const jsonBody=JSON.parse(argv[argv.length-1]);
 assert.deepEqual(jsonBody,demo.request.json_body);
});
test('catalog exposes valid unpaid probe instead of treating 400 GET as proof of no paywall',()=>{
 assert.equal(ownerOffer.method,'POST');
 assert.equal(ownerOffer.price_native_circle_usdc,'0.005000');
 assert.equal(ownerOffer.current_unauthorized_valid_request_http_status,402);
 assert.equal(ownerOffer.invalid_request_http_status,400);
 assert.equal(ownerOffer.input_validation_precedes_unsigned_http402,true);
 assert.equal(ownerOffer.get_head_or_empty_json_probe_cannot_discover_post_paywall,true);
 assert.equal(ownerOffer.independently_paid_buyer_owned_post_orders_proven,0);
 assert.equal(ownerOffer.valid_unsigned_POST_probe,'https://livastic-vm1-primary.github.io/paperpilot-tools/x402-post-discovery.json');
});
test('page has visible machine-readable link and links to independent external reproduction',()=>{
 assert.match(html,/<link rel="alternate" type="application\/json" href="x402-post-discovery\.json"/);
 assert.match(html,/href="x402-post-discovery\.json">machine-readable POST quote-probe manifest/);
 assert.match(html,/https:\/\/github\.com\/x402-foundation\/x402\/issues\/3722#issuecomment-6289166310/);
 assert.match(html,/A GET\/HEAD route check returns 404/);
 assert.match(html,/neither this link nor an unpaid HTTP 402 creates revenue/i);
 assert.match(llm,/x402-post-discovery\.json/);
});
test('third-party receipt is only valid POST 402/CORS confirmation, not completed payment',()=>{
 assert.equal(d.independent_third_party_original_402_verification.public_comment_url,'https://github.com/x402-foundation/x402/issues/3722#issuecomment-6289166310');
 assert.match(d.independent_third_party_original_402_verification.claim_verified,/Valid synthetic JSON POST/);
 assert.match(d.independent_third_party_original_402_verification.does_not_verify,/Real paid 200 response/);
 assert.equal(demo.free_quote_authorizes_spending,false);
 assert.equal(ownerOffer.verified_paid_post_customers,0);
});
