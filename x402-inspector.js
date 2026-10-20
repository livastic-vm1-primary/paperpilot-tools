/* Page-only rendering. Public unsigned quote stays in this browser.
 * No fetch, analytics, wallet, credential storage, or payment action. */
(function () {
  "use strict";
  const {analyze, TEST_FIXTURE, INVOICE_MISMATCH_FIXTURE} = window.PaperPilotX402;
  const input = document.getElementById("quote");
  const cap = document.getElementById("cap");
  const expectedInvoice = document.getElementById("expected-invoice-usdc");
  const results = document.getElementById("results");
  const btnInspect = document.getElementById("inspect");
  const btnDemo = document.getElementById("demo");
  const btnInvoiceDemo = document.getElementById("invoice-mismatch-demo");
  const btnClear = document.getElementById("clear");
  let lastReport = null;

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function field(parent, label, value) {
    const dl = el("dl", "field");
    dl.append(el("dt", "", label), el("dd", "", String(value || "Not specified")));
    parent.append(dl);
  }
  function showError(error) {
    lastReport = null;
    const head = el("div", "result-head");
    head.append(el("span", "result-badge error", "LOCAL INPUT ERROR"),
      el("h2", "", "Nothing was sent."),
      el("p", "", "The quote could not be decoded. No API or wallet was contacted."));
    const box = el("p", "err-msg", String(error && error.message || "Invalid public quote").slice(0, 600));
    results.replaceChildren(head, box);
  }
  function render(report) {
    lastReport = report;
    const head = el("div", "result-head");
    head.append(el("span", "result-badge", "OFFLINE STRUCTURAL INSPECTION"),
      el("h2", "", report.options.length + " payment option" + (report.options.length === 1 ? "" : "s") + " found"),
      el("p", "", "No merchant identity, on-chain payment, asset ownership, signatures or wallet status verified."));
    results.replaceChildren(head);
    if (report.merchantReportedError) {
      const errorBox = el("div", "quote-row");
      errorBox.append(
        el("h3", "", "Merchant-reported error (unverified)"),
        el("p", "fine", report.merchantReportedError),
        el("p", "fine", "An error field in an HTTP 402 is not a settlement receipt. After any signed attempt, check independent wallet/transaction status before retrying.")
      );
      results.append(errorBox);
    }
    if (report.resource.url) field(results, "Quoted resource", report.resource.url);
    field(results, "Display cap", report.maxDisplayBudgetUSDC + " USDC");
    const wire = report.transportHeaderBudget;
    const wireBox = el("div", "quote-row");
    wireBox.append(el("h3", "", "PAYMENT-REQUIRED transport budget (not a payment test)"));
    field(wireBox, "Header size", wire.estimatedHttp1HeaderLineBytes.toLocaleString() + " bytes (HTTP/1 field line only)");
    field(wireBox, "Measurement", wire.method === "observed-public-header" ? "Observed public Base64 field" : "Estimate from compact JSON, not actual server bytes");
    field(wireBox, "Compatibility risk", wire.risk.replaceAll("_", " "));
    wireBox.append(el("p", "fine", "Check your real client, reverse proxy and total response headers. 2/8/16 KiB are illustrative implementation checkpoints, not a universal x402 size limit. No signed retries or network requests were made."));
    if (wire.exceeds8KiB) wireBox.classList.add("invoice-verdict-stop");
    results.append(wireBox);
    const breakdown = report.optionalMetadataBudget;
    const metadataBox = el("div", "quote-row");
    metadataBox.append(el("h3", "", "Where public optional Bazaar metadata uses bytes"));
    if (!breakdown.hypotheticalNonAdditiveRankedCandidates.length) {
      metadataBox.append(el("p", "fine", "No supported optional Bazaar metadata fields found for savings analysis. This does not mean the route is HTTP-client compatible."));
    } else {
      const items = el("ol", "warnings");
      for (const candidate of breakdown.hypotheticalNonAdditiveRankedCandidates) {
        items.append(el("li", "", candidate.path + ": hypothetically ~" + candidate.hypotheticalHeaderBytesSaved.toLocaleString() + " encoded bytes saved if removed by the merchant after review."));
      }
      metadataBox.append(items);
    }
    metadataBox.append(el("p", "fine", "Each field is evaluated independently with compact JSON; savings cannot be added. No field is removed, no original quote changed and no code is patched. Buyers may rely on Bazaar metadata; discuss changes with the merchant."));
    results.append(metadataBox);

    const decision = report.invoiceComparison;
    const warnBlock = el("div", "invoice-price-verdict");
    warnBlock.append(el("h3", "", "Invoice expected-price check (untrusted quote; no payment)"),
      el("p", "", "Expected: " + (decision.expectedInvoiceUSDC===null ? "not entered" : decision.expectedInvoiceUSDC + " USDC")),
      el("p", "invoice-verdict-state", decision.state.replaceAll("_", " ")),
      el("p", "fine", decision.explanation));
    if (decision.state.startsWith("STOP")) warnBlock.classList.add("invoice-verdict-stop");
    results.append(warnBlock);
    report.options.forEach(choice => {
      const row = el("div", "quote-row");
      row.append(el("h3", "", "OPTION " + choice.index));
      field(row, "Network", choice.network || "Missing");
      field(row, "Asset", choice.asset || "Missing");
      field(row, "Scheme", choice.scheme || "Missing");
      field(row, "Atomic amount", choice.amountAtomic || "Missing");
      field(row, "Native Base USDC", choice.amountUSDC === null ? "Not applicable / unknown" : choice.amountUSDC);
      field(row, "payTo", choice.payTo || "Missing");
      const list = el("ul", "warnings");
      choice.issues.forEach(issue => list.append(el("li", "", issue)));
      row.append(list);
      results.append(row);
    });
    if (report.notices.length) {
      const warnings = el("ul", "warnings");
      report.notices.forEach(t => warnings.append(el("li", "", t)));
      results.append(warnings);
    }
    results.append(el("p", "fine", report.caveat));
    const copy = el("button", "copy", "Copy sanitized JSON summary");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2));
        copy.textContent = "Summary copied locally";
      } catch {
        copy.textContent = "Clipboard unavailable; nothing was uploaded";
      }
    });
    results.append(copy);
  }
  btnInspect.addEventListener("click", () => {
    try {render(analyze(input.value, cap.value, expectedInvoice.value));}
    catch (error) {showError(error);}
  });
  btnDemo.addEventListener("click", () => {
    input.value = JSON.stringify(TEST_FIXTURE, null, 2);
    cap.value = "0.02";
    expectedInvoice.value = "";
    render(analyze(input.value, cap.value, expectedInvoice.value));
  });
  btnInvoiceDemo.addEventListener("click", () => {
    input.value = JSON.stringify(INVOICE_MISMATCH_FIXTURE, null, 2);
    cap.value = "10000";
    expectedInvoice.value = "0.10";
    render(analyze(input.value, cap.value, expectedInvoice.value));
  });
  btnClear.addEventListener("click", () => {
    input.value = "";
    expectedInvoice.value = "";
    lastReport = null;
    results.replaceChildren(el("div", "results-intro", "Cleared. No quote saved or sent. Load the fictional sample or paste a public unsigned quote."));
  });
})();
