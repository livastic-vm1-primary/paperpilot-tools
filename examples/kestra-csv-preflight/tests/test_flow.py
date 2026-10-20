"""Offline runnable checks for the Kestra YAML inline Python script.

These tests use an isolated fake Kestra.outputs capture, not a Kestra server.
They test Python behavior + YAML data only; do NOT claim Kestra cloud execution.
"""
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
FLOW = yaml.safe_load((ROOT / "flow.yml").read_text(encoding="utf-8"))
TASK = FLOW["tasks"][0]
SCRIPT = TASK["script"]
MOCK = """import sys, types, json
module = types.ModuleType("kestra")
class Kestra:
    @staticmethod
    def outputs(record):
        open("__outputs.json", "w", encoding="utf8").write(json.dumps(record))
module.Kestra = Kestra
sys.modules["kestra"] = module
"""
def run_case(contents: bytes):
    with tempfile.TemporaryDirectory() as tmp:
        d = Path(tmp)
        (d / "feed.csv").write_bytes(contents)
        (d / "main.py").write_text(MOCK + SCRIPT, encoding="utf-8")
        proc = subprocess.run(
            [sys.executable, "main.py"], cwd=d,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=10, check=False)
        if proc.returncode:
            raise AssertionError("Python script failed: " + proc.stderr.decode()[:650])
        return (json.loads((d / "report.json").read_text()),
                json.loads((d / "__outputs.json").read_text()),
                proc.stdout.decode("utf-8", errors="replace"))

class KestraFlowOfflineTests(unittest.TestCase):
    def test_kestra_shapes_and_branch(self):
        self.assertEqual(FLOW["namespace"], "demos.csv_quality")
        self.assertEqual(TASK["type"], "io.kestra.plugin.scripts.python.Script")
        self.assertEqual(TASK["outputFiles"], ["report.json"])
        self.assertEqual(FLOW["tasks"][1]["type"], "io.kestra.plugin.core.flow.If")
        self.assertEqual(FLOW["tasks"][1]["condition"], "{{ outputs.preflight.vars.accepted }}")
        self.assertFalse(any("http" in str(v) for v in TASK["script"].splitlines()))
    def test_fixture_and_mock_outputs(self):
        fixture = TASK["inputFiles"]["feed.csv"].encode("utf-8")
        report, payload, stdout = run_case(fixture)
        self.assertTrue(report["accepted"])
        self.assertEqual(report["rows"], 2)
        self.assertEqual(report["columns"], 3)
        self.assertEqual(payload, {"accepted": True, "rows": 2, "issue_count": 0})
        self.assertEqual(stdout, "")
    def test_quoted_comma_and_multiline(self):
        r,_,_ = run_case(b'id,note\n1,"hello, world"\n2,"two\nlines"\n')
        self.assertTrue(r["accepted"])
        self.assertEqual(r["rows"], 2)
    def test_reject_unbalanced_quote(self):
        r,_,_ = run_case(b'id,note\n1,"never ends')
        self.assertFalse(r["accepted"])
        self.assertEqual(r["issue_counts"]["invalid_csv_quoting"], 1)
    def test_reject_ragged_columns(self):
        r,_,_ = run_case(b'id,name\n1,Ada,extra\n')
        self.assertFalse(r["accepted"])
        self.assertIn("ragged_rows", r["issue_counts"])
    def test_reject_blank_cells(self):
        r,_,_ = run_case(b'id,name\n1,\n')
        self.assertFalse(r["accepted"])
        self.assertIn("empty_values", r["issue_counts"])
    def test_reject_duplicate_rows(self):
        r,_,_ = run_case(b'id,name\n1,Ada\n1,Ada\n')
        self.assertIn("duplicate_rows", r["issue_counts"])
    def test_reject_normalized_duplicate_headers(self):
        r,_,_ = run_case(b'Id, id\n1,2\n')
        self.assertIn("duplicate_headers", r["issue_counts"])
    def test_reject_formula_prefix_without_rendering_value(self):
        raw = b'id,notes\n1,=HYPERLINK("https://example.invalid")\n'
        r,_,stdout = run_case(raw)
        self.assertIn("formula_like_values", r["issue_counts"])
        self.assertNotIn("HYPERLINK", json.dumps(r) + stdout)
    def test_accept_negative_number_not_formula(self):
        r,_,_ = run_case(b'id,delta\n1,-12.50\n')
        self.assertTrue(r["accepted"])
    def test_reject_invalid_utf8(self):
        r,_,_ = run_case(b'id,name\n1,\xff\n')
        self.assertIn("invalid_utf8", r["issue_counts"])
    def test_reject_oversized_input(self):
        r,_,_ = run_case(b'id,name\n' + b'1,Ada\n' * 6000)
        self.assertIn("too_many_bytes", r["issue_counts"])
        self.assertEqual(r["bytes"], 32769)
    def test_reject_no_data(self):
        r,_,_ = run_case(b'id,name\n')
        self.assertIn("no_data_rows", r["issue_counts"])
    def test_reject_over_row_limit(self):
        r,_,_ = run_case(b'id,name\n' + b'1,Ada\n' * 501)
        self.assertIn("too_many_rows", r["issue_counts"])
        self.assertEqual(r["rows"], 500)
    def test_no_unrequested_money_or_data_upload(self):
        text = (ROOT / "flow.yml").read_text()
        self.assertNotIn("PAYMENT-SIGNATURE", text)
        self.assertNotIn("apiKey", text)
        self.assertNotIn("requests.post", text)
        self.assertIn("No downstream upload is configured", text)

if __name__ == "__main__":
    unittest.main()
