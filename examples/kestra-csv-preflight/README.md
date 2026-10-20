# Kestra CSV preflight — reject flawed data before publishing

**Original AI-assisted educational sample.** One economic owner; no impersonated author, fictional customer, charged request or commercial endorsement.

This sample demonstrates one Kestra Python Script task followed by an If branch. The Python script inspects a fictional CSV, creates a **redacted metadata report** and emits a Boolean through Kestra.outputs. A real data-ingestion step is deliberately **not configured**: the accepted branch only logs the next step, and the rejected branch refers to the report URI, not raw CSV records.

- flow.yml: self-contained YAML with synthetic CSV fixture, bounded Python script, JSON report, and two branch outcomes.
- tests/test_flow.py: standalone Python tests that extract the exact inline script and use a fake Kestra.outputs module.

## Reproduce offline

Requires Python 3.10+ and PyYAML 6.x:

~~~sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install 'PyYAML>=6.0,<7'
python -m unittest discover -s tests -p 'test_*.py' -v
~~~

Fifteen checks cover clean CSV, quoted commas, multiline cells, broken quoting, mismatched rows, missing fields, duplicate rows and headers, possible spreadsheet-formula prefixes, invalid UTF-8, oversized input and row caps. The tests execute the exact Python code locally with a clearly labeled **fake Kestra.outputs**, rather than starting a Kestra server. **No actual Kestra runtime execution is claimed.**

## Production Kestra verification

The flow uses official Script task features including dependencies, inputFiles, outputFiles, Kestra.outputs and the core flow.If condition reading outputs.preflight.vars.accepted. Paste it into an authorized Kestra instance, run the unchanged fictional fixture (expected accepted branch), then change one value to =2+3 (expected rejected branch). Verify that no downstream data-upload task exists and that your own artifact access and retention rules apply before integrating real data.

Official documentation reviewed 2026-10-20:
- https://kestra.io/plugins/plugin-script-python/v1.9.9/io.kestra.plugin.scripts.python.script
- https://kestra.io/plugins/core/flow/io.kestra.plugin.core.flow.if
- https://kestra.io/docs/scripts/outputs-metrics

## Limits

This is a deliberately conservative 32 KiB structural CSV preflight, not a malware scan, accounting/semantic certification, spreadsheet safe-export policy or production ingestion pipeline. It reports issue *counts* rather than CSV content. No user wallet, account, x402 payment, external upload or hidden analytics are required.
