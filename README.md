# PaperPilot Tools public website

This repository contains a pre-launch marketing landing page, free single-item quote calculator, and bilingual English/Korean client handoff guide.

Live: https://livastic-vm1-primary.github.io/paperpilot-tools/

The commercial app and purchase ZIP are NOT included in this public repo.

## Integrity
Static HTML, CSS, SVG and JavaScript only. No external scripts, tracking, account logins, crypto wallet links, or on-site payments. The sample calculator runs in the browser and does not upload form data.

**Commercial availability:** The buyer ZIP and a seller draft exist on Gumroad, but checkout is blocked until verified payout onboarding. The landing page does not claim that a commercial checkout is currently active.

**Limits:** A quote is not a certified electronic tax invoice; calculations are examples and not financial advice.

## Testing
On the owner-controlled VM: node --check app.js and Playwright local/browser regression checks. Don't upload credentials or recovery phrases to issues or pull requests.

© 2026 PaperPilot Tools. All rights reserved.
\nNew: public service information at https://livastic-vm1-primary.github.io/paperpilot-tools/services.html and transparent ScopeLens model evaluation notes at https://dev.to/livasticvm1primary/why-i-kept-8-transparent-rules-after-testing-small-local-llms-3lam .\n
Separate live agent-marketplace reference (active listing; zero verified purchases/payouts): https://clawlancer.ai/marketplace/13ec0c6b-e278-4660-bc20-3579651feab5 — 25 USDC one-public-URL QA, distinct from larger tailored work. The marketplace onchain checkout and seller settlement have not been independently tested; do not claim earnings.

## Korean freelance estimate guide (free)

Public educational article and on-device KRW sample calculator: https://livastic-vm1-primary.github.io/paperpilot-tools/freelance-estimate-ko.html . It does NOT create a certified e-tax invoice, replace tax advice, collect payment, or upload entered names/amounts. Headless Chrome e2e tests under private VM1 research/browserqa/ verify input arithmetic, TXT export, HTML escaping, layout and absence of external network calls.
