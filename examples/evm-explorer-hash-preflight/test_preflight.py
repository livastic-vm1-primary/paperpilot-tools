import importlib.util
import json
import unittest
from pathlib import Path
p = Path(__file__).parent / 'preflight.py'
spec = importlib.util.spec_from_file_location('evmpreflight', p)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
H1 = '0x'+'a'*64
H2 = '0x'+'b'*64
def a(text, chain=8453): return m.audit(text.encode(), chain)

class EvmCsvTests(unittest.TestCase):
    def test_fictional_demo(self):
        r = m.audit(m.DEMO.encode(), 8453)
        self.assertEqual(r['valid_hash_rows'], 3)
        self.assertEqual(r['unique_hashes_for_rpc_discovery_only'], 2)
        self.assertEqual(r['repeated_hash_discovery_rows_NOT_duplicate_economic_events'], 1)
    def test_log_rows_not_duplicated_economic_events(self):
        r = a('Transaction Hash,Log Index\n'+H1+',0\n'+H1+',1')
        self.assertFalse(r['authorization_to_delete_duplicate_event_rows'])
        self.assertEqual(r['unique_hashes_for_rpc_discovery_only'],1)
    def test_distinct_hashes(self):
        self.assertEqual(a('Transaction Hash,X\n'+H1+',1\n'+H2+',1')['unique_hashes_for_rpc_discovery_only'],2)
    def test_hash_casefold(self):
        x=H1.upper().replace('0X','0x')
        self.assertEqual(a('Transaction Hash,X\n'+H1+',1\n'+x+',2')['unique_hashes_for_rpc_discovery_only'],1)
    def test_quoted_newline_crlf(self):
        r=a('Transaction Hash,Text\r\n'+H1+',"a,b\nc"\r\n')
        self.assertEqual(r['total_rows'],1)
        self.assertEqual(r['malformed_column_rows'],0)
    def test_bom_support(self):
        b=('\ufeffTransaction Hash,X\n'+H1+',1').encode('utf8')
        self.assertEqual(m.audit(b,1)['valid_hash_rows'],1)
    def test_missing_hash_count(self):
        self.assertEqual(a('Transaction Hash,X\n,1\n'+H1+',2')['invalid_or_missing_hash_rows'],1)
    def test_wrong_size_hash(self):
        self.assertEqual(a('Transaction Hash,X\n0xabc,1')['unique_hashes_for_rpc_discovery_only'],0)
    def test_ragged_skip(self):
        r=a('Transaction Hash,X\n'+H1+',1,extra\n'+H2+',2')
        self.assertEqual(r['malformed_column_rows'],1)
        self.assertEqual(r['unique_hashes_for_rpc_discovery_only'],1)
    def test_no_hash_header(self):
        with self.assertRaisesRegex(ValueError,'exactly one'):a('Amount,X\n1,2')
    def test_colliding_hash_headers(self):
        with self.assertRaisesRegex(ValueError,'exactly one'):a('Transaction Hash,Txn Hash\n'+H1+','+H1)
    def test_invalid_csv_quotes(self):
        with self.assertRaisesRegex(ValueError,'Malformed'):a('Transaction Hash,X\n'+H1+',"unclosed')
    def test_invalid_utf8(self):
        with self.assertRaisesRegex(ValueError,'UTF-8'):m.audit(b'Transaction Hash,X\n\xff,1',8453)
    def test_explicit_chain_not_verified_by_file(self):
        r=a('Transaction Hash,X\n'+H1+',1',137)
        self.assertEqual(r['selected_chain_unverified_from_csv'],137)
        self.assertFalse(r['completeness_or_used_query_ranges_proven'])
    def test_invalid_chain(self):
        for x in [0,-1,2**32,True]:
            with self.subTest(x=x),self.assertRaises(ValueError):
                m.audit(m.DEMO.encode(),x)
    def test_soft_5000_warning(self):
        x='Transaction Hash,X\n'+(H1+',1\n')*5000
        r=a(x)
        self.assertTrue(r['at_or_over_5000_export_cap_REVIEW_not_proof'])
        self.assertFalse(r['completeness_or_used_query_ranges_proven'])
    def test_4999_not_near_export_cap(self):
        self.assertFalse(a('Transaction Hash,X\n'+(H1+',1\n')*4999)['at_or_over_5000_export_cap_REVIEW_not_proof'])
    def test_max_rows_reject(self):
        with self.assertRaisesRegex(ValueError,'5,500'):a('Transaction Hash,X\n'+(H1+',1\n')*5501)
    def test_no_private_data_or_identifiers_echoed(self):
        r=a('Transaction Hash,Comment\n'+H1+',sensitive personal memo')
        self.assertNotIn(H1,json.dumps(r))
        self.assertNotIn('sensitive personal memo',json.dumps(r))
    def test_size_and_nul_guard(self):
        with self.assertRaisesRegex(ValueError,'4 MiB'): m.audit(b'a'*(m.LIMIT_BYTES+1),8453)
        with self.assertRaisesRegex(ValueError,'NUL'):m.audit(b'Transaction Hash,X\n'+H1.encode()+b',\0',8453)

if __name__ == '__main__':unittest.main()
