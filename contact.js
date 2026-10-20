'use strict';
// A public service category may preselect the inquiry form; other values are ignored.
// No private fields are prefilled and no network requests are made by this script.
(function () {
  const categories = Object.freeze({
    'koinly-mini-5': 'Koinly one-source 10-row manual CSV map (5 Base USDC proposed)',
    invoice: 'Bilingual invoice or quote template',
    utility: 'Offline browser utility',
    qa: 'Playwright browser QA',
    'x402-cors': 'x402 merchant CORS and quote QA',
    'workspace-invoice': 'Google Workspace Gmail Drive invoice intake QA',
    'tradeid-review': 'Crypto Trade-ID CSV 50-row manual review (15 Base USDC)',
    'crypto-csv-rescue': 'Crypto CSV Rescue multi-export 50-row pilot (49 USD indicative)',
    'usdc-invoice-pilot': 'USDC invoice and receipt exception review (USD 49 proposed)'
  });
  const service = new URL(window.location.href).searchParams.get('service');
  if (!Object.prototype.hasOwnProperty.call(categories, service)) return;
  const selector = document.getElementById('f-service');
  if (!selector) return;
  const expected = categories[service];
  if (Array.from(selector.options).some(option => option.value === expected)) {
    selector.value = expected;
  }
})();
