'use strict';
// A public service category may preselect the inquiry form; other values are ignored.
// No private fields are prefilled and no network requests are made by this script.
(function () {
  const categories = Object.freeze({
    invoice: 'Bilingual invoice or quote template',
    utility: 'Offline browser utility',
    qa: 'Playwright browser QA',
    'x402-cors': 'x402 merchant CORS and quote QA'
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
