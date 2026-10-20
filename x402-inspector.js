/* Page-only rendering. Public unsigned quote stays in this browser.
 * No fetch, analytics, wallet, credential storage, or payment action. */
(function () {
  "use strict";
  const {analyze, TEST_FIXTURE} = window.PaperPilotX402;
  const input = document.getElementById("quote");
  const cap = document.getElementById("cap");
  const results = document.getElementById("results");
  const btnInspect = document.getElementById("inspect");
  const btnDemo = document.getElementById("demo");
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
    if (report.resource.url) field(results, "Quoted resource", report.resource.url);
    field(results, "Display cap", report.maxDisplayBudgetUSDC + " USDC");
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
    try {render(analyze(input.value, cap.value));}
    catch (error) {showError(error);}
  });
  btnDemo.addEventListener("click", () => {
    input.value = JSON.stringify(TEST_FIXTURE, null, 2);
    cap.value = "0.02";
    render(analyze(input.value, cap.value));
  });
  btnClear.addEventListener("click", () => {
    input.value = "";
    lastReport = null;
    results.replaceChildren(el("div", "results-intro", "Cleared. No quote saved or sent. Load the fictional sample or paste a public unsigned quote."));
  });
})();
