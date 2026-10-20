"""Pure offline tests; no original customer file or network access."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parent
SCRIPT=ROOT/"csv-import-audit.py"
spec=importlib.util.spec_from_file_location("paperpilot_csv_import_audit",SCRIPT)
audit=importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

class CsvImportAuditTests(unittest.TestCase):
    def test_demo_matches_actual_fictional_small_csv(self):
        d=audit.check(audit.FICTIONAL,True)
        self.assertEqual((d["dataRows"],d["columns"],d["raggedRows"],d["missingCells"],d["duplicateRows"],d["formulaPrefixWarnings"]),(5,3,1,3,1,1))
        self.assertEqual(d["chargedUSDC"],"0")
    def test_rfc4180_embedded_newline_and_quoted_comma(self):
        d=audit.check('id,name\r\n1,"Ada, Lovelace"\r\n2,"Two\nlines"\r\n')
        self.assertEqual((d['dataRows'],d['raggedRows'],d['missingCells']),(2,0,0))
    def test_duplicate_header_case_trim_collision(self):
        d=audit.check('id, ID, ,id\n1,2,3,4\n')
        self.assertEqual(d['duplicateHeaders'],2)
        self.assertEqual(d['blankHeaders'],1)
    def test_ragged_short_and_long_rows(self):
        d=audit.check('id,name\n1,Ada\n2\n3,Bob,Extra\n')
        self.assertEqual((d['raggedRows'],d['shortRows'],d['longRows'],d['missingCells']),(2,1,1,1))
    def test_duplicate_row_hash_unambiguous_field_separator(self):
        d=audit.check('id,note\n1,"a,b"\n1,a\n1,"a,b"\n')
        self.assertEqual(d['duplicateRows'],1)
    def test_empty_cell_and_short_row_both_missing(self):
        d=audit.check('a,b,c\n1,,\n2,b\n')
        self.assertEqual(d['missingCells'],3)
    def test_formula_warns_but_negative_numbers_not_flagged(self):
        d=audit.check('v\n=1+1\n+2\n@x\n-x\n-2\n-2.50\n-2e3\n')
        self.assertEqual(d['formulaPrefixWarnings'],4)
    def test_csv_parser_strict_bad_quote(self):
        with self.assertRaises(audit.AuditError): audit.check('id,note\n1,"no end')
    def test_blank_csv_and_header_only_fail(self):
        for x in ['','\r\n','id,name\n']:
            with self.subTest(x=x):
                with self.assertRaises(audit.AuditError): audit.check(x)
    def test_too_many_columns(self):
        with self.assertRaises(audit.AuditError): audit.check(','.join('h'+str(i) for i in range(26))+'\n'+','.join('v' for _ in range(26))+'\n')
    def test_too_many_rows(self):
        d='id\n'+'1\n'*10001
        with self.assertRaises(audit.AuditError): audit.check(d)
    def test_strict_utf8_bom_local_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'synthetic.csv'
            path.write_bytes(b'\xef\xbb\xbfid,name\r\n1,Ada\r\n')
            d=audit.check(audit.load_file(str(path)))
            self.assertTrue(d['ok'])
            self.assertEqual(d['dataRows'],1)
    def test_non_utf8_file_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'synthetic.csv';path.write_bytes(b'id\n\xff\n')
            with self.assertRaises(audit.AuditError):audit.load_file(str(path))
    def test_oversized_2mib_file_refused_cheaply(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'synthetic.csv';path.write_bytes(b'i'*((2*1024*1024)+1))
            with self.assertRaises(audit.AuditError):audit.load_file(str(path))
    def test_symlink_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            original=Path(folder)/'original.csv';original.write_text('id\n1\n')
            link=Path(folder)/'link.csv';link.symlink_to(original)
            with self.assertRaises(audit.AuditError):audit.load_file(str(link))
    def test_cli_file_quiet_aggregate_does_not_echo_private_record(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'private.csv';path.write_text('id,name\n1,SENSITIVE_PLACEHOLDER_898231\n')
            p=subprocess.run([sys.executable,str(SCRIPT),'--file',str(path)],capture_output=True,text=True,timeout=6)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertNotIn('SENSITIVE_PLACEHOLDER',p.stdout)
            self.assertNotIn(str(path),p.stdout)
            j=json.loads(p.stdout);self.assertEqual(j['walletSignatures'],0)
    def test_cli_error_does_not_echo_file_name(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'my-super-secret.csv'
            p=subprocess.run([sys.executable,str(SCRIPT),'--file',str(path)],capture_output=True,text=True,timeout=6)
            self.assertEqual(p.returncode,2,p.stderr)
            self.assertNotIn('my-super-secret',p.stdout)
    def test_source_prohibits_network_credentials_wallet_and_mutating_customer_data(self):
        content=SCRIPT.read_text()
        for signature in ["requests.", "urllib.request","http.client","socket.","subprocess.","os.system","eval(","exec(","write_text(","write_bytes(","open(\"w\")","os.environ","private_key","sendTransaction","approve("]:
            self.assertNotIn(signature,content,signature)
    def test_data_preflight_does_not_claim_paid_service_or_semantic_truth(self):
        j=audit.check(audit.FICTIONAL,True)
        self.assertTrue(j['localOnly']);self.assertEqual(j['uploadRequests'],0)
        self.assertIn("not repair",j['limitations'])
        self.assertEqual(j['chargedUSDC'],"0")

if __name__=="__main__":unittest.main()
