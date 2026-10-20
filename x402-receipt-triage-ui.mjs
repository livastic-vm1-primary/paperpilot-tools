import {triageX402Incident, demoPostPaymentFailure} from "./x402-receipt-triage-core.mjs";
const byId = id => document.getElementById(id);
const form = byId("receipt-triage-form");
const output = byId("receipt-triage-result");
const status = byId("receipt-triage-status");
if (!form || !output || !status) {
  throw new Error("Receipt triage UI is missing its expected form controls.");
}
const p = (text,cls="") => {
  const x = document.createElement("p");x.textContent=text;if(cls)x.className=cls;return x;
};
const render = () => {
  output.replaceChildren();
  try {
    const report = triageX402Incident({
      signed: byId("incident-signed").value,
      onchain: byId("incident-chain").value,
      delivery: byId("incident-delivery").value,
      publicBaseTxHash: byId("incident-hash").value
    });
    output.append(p(report.status.replaceAll("_", " "), "incident-verdict"));
    output.append(p(report.explanation));
    const label = document.createElement("h3");label.textContent = "Safe follow-up checklist";output.append(label);
    const list = document.createElement("ol");
    for (const step of report.steps) {
      const li = document.createElement("li");li.textContent = step;list.append(li);
    }
    output.append(list);
    if(report.txExplorerUrl) {
      const a = document.createElement("a");
      a.href = report.txExplorerUrl;a.target="_blank";a.rel="noopener noreferrer";
      a.textContent = "Open my PUBLIC transaction in BaseScan ↗";
      output.append(a);
    }
    output.append(p(report.disclaimer, "incident-compact"));
    status.textContent = "Local-only classification. Your chain and delivery states were not verified; no payment or network call was made.";
  } catch (e) {
    output.append(p("No report generated. "+e.message));
    status.textContent = "Rejected invalid input. No data sent.";
  }
};
form.addEventListener("submit", event => {event.preventDefault();render();});
byId("incident-demo").addEventListener("click", () => {
  byId("incident-signed").value=demoPostPaymentFailure.signed;
  byId("incident-chain").value=demoPostPaymentFailure.onchain;
  byId("incident-delivery").value=demoPostPaymentFailure.delivery;
  byId("incident-hash").value=demoPostPaymentFailure.publicBaseTxHash;
  render();
});
byId("incident-clear").addEventListener("click", () => {
  form.reset();output.replaceChildren();status.textContent = "Inputs cleared locally. No payment or remote verification.";
});
