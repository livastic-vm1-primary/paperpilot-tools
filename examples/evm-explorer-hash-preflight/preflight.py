#!/usr/bin/env python3
"""Original offline EVM CSV hash-only discovery preflight. Never a chain import.
This intentionally does not confuse a repeated hash with duplicate economic logs.
"""
from __future__ import annotations
import argparse
import csv
import io
import json
import re
import sys
from pathlib import Path

LIMIT_BYTES = 4 * 1024 * 1024
LIMIT_ROWS = 5500
HASH_RE = re.compile(r'^0x[0-9a-fA-F]{64}$')
HASH_HEADERS = {'transaction hash', 'txn hash', 'tx hash', 'txhash'}
H1 = '0x' + 'a' * 64
H2 = '0x' + 'b' * 64
DEMO = ('Transaction Hash,Blockno,Method\r\n'
        + H1 + ',101,Transfer\r\n'
        + H1 + ',101,Transfer\r\n'
        + H2 + ',102,Swap\r\n')

def audit(source: bytes, chain: int):
    if type(chain) is not int or not 1 <= chain < (1 << 32):
        raise ValueError('Expected a positive 32-bit selected chain ID.')
    if not isinstance(source, bytes) or not source or len(source) > LIMIT_BYTES:
        raise ValueError('Expected nonempty local CSV up to 4 MiB.')
    try:
        text = source.decode('utf-8-sig', errors='strict')
    except UnicodeDecodeError as err:
        raise ValueError('CSV must be valid UTF-8 without lossy replacement.') from err
    if '\x00' in text:
        raise ValueError('NUL character in CSV.')
    try:
        csv_reader = csv.reader(io.StringIO(text, newline=''), strict=True)
        headings = next(csv_reader, None)
        if not headings or len(headings) < 2 or len(headings) > 80:
            raise ValueError('Expected 2-80 CSV header columns.')
        indices = [i for i, key in enumerate(headings) if key.strip().lower() in HASH_HEADERS]
        if len(indices) != 1:
            raise ValueError('Expected exactly one Transaction Hash / Txn Hash header.')
        col = indices[0]
        n = invalid = malformed = repeated = valid = 0
        hashes = set()
        for row in csv_reader:
            if not row or all(not cell.strip() for cell in row):
                continue
            n += 1
            if n > LIMIT_ROWS:
                raise ValueError('CSV exceeds 5,500 data records.')
            if len(row) != len(headings):
                malformed += 1
                continue
            h = row[col].strip()
            if not HASH_RE.fullmatch(h):
                invalid += 1
                continue
            valid += 1
            h = h.lower()
            if h in hashes:
                repeated += 1
            else:
                hashes.add(h)
    except csv.Error as err:
        raise ValueError('Malformed quoted CSV field.') from err
    if n == 0:
        raise ValueError('No data records in CSV.')
    return {
        'schema': 'offline-evm-hash-preflight-v1',
        'selected_chain_unverified_from_csv': chain,
        'total_rows': n,
        'valid_hash_rows': valid,
        'unique_hashes_for_rpc_discovery_only': len(hashes),
        'repeated_hash_discovery_rows_NOT_duplicate_economic_events': repeated,
        'invalid_or_missing_hash_rows': invalid,
        'malformed_column_rows': malformed,
        'at_or_over_5000_export_cap_REVIEW_not_proof': n >= 5000,
        'completeness_or_used_query_ranges_proven': False,
        'full_transactions_receipts_or_traces_verified': False,
        'authorization_to_delete_duplicate_event_rows': False,
        'raw_identifiers_in_report': False,
        'warnings': [
            'One EVM transaction hash may occur on many ERC-20 Transfer log rows or internal traces; never delete economic events merely because hashes repeat.',
            'Use export hashes only to discover tx data; fetch canonical receipts/logs/traces from authorized RPC before storing or decoding.',
            'Check chain selection against eth_chainId before any real lookup. This CSV cannot establish network identity.',
            'At >= 5,000 rows, verify the exporter limit and split time/block ranges; exactly 5,000 is not proof of truncation.',
            'CSV exports do NOT establish complete used_query_ranges; do not mark them complete.',
        ],
    }

def main():
    p = argparse.ArgumentParser(description='Local-only hash-discovery report with no internet calls.')
    p.add_argument('--chain', type=int, default=8453)
    args = p.add_mutually_exclusive_group(required=True)
    args.add_argument('--demo', action='store_true')
    args.add_argument('--file', type=Path)
    x = p.parse_args()
    try:
        if x.demo:
            source = DEMO.encode()
        else:
            if not x.file.is_file() or x.file.stat().st_size > LIMIT_BYTES:
                raise ValueError('Local file missing or larger than 4 MiB.')
            source = x.file.read_bytes()
        report = audit(source, x.chain)
    except (ValueError, OSError) as ex:
        print(json.dumps({'ok': False, 'reason': str(ex)[:180]}), file=sys.stderr)
        return 2
    print(json.dumps({'ok': True, 'report': report}, indent=2))
    return 0

if __name__ == '__main__':
    sys.exit(main())
