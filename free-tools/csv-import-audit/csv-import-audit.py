#!/usr/bin/env python3
"""PaperPilot standalone private-by-default CSV structural preflight.

No network, subprocess, wallet, auth, disk writes or raw-record output.
For a small, non-confidential CSV <= 2 MiB, <= 10,000 data records, <= 25
columns. This is NOT normalization, semantic validation or an import guarantee.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import stat
import sys

MAX_BYTES = 2 * 1024 * 1024
MAX_DATA_ROWS = 10_000
MAX_COLUMNS = 25
MAX_FIELD_BYTES = 65_536
SAFE_NUMERIC_MINUS = re.compile(r"^-[0-9]+(?:[.,][0-9]+)?(?:[eE][+-]?[0-9]+)?$")
FICTIONAL = (
    'id,name,amount\n'
    '1,Ada,15\n'
    '2,,20\n'
    '2,,20\n'
    '3,"=HYPERLINK(""https://example.invalid"", ""demo"")",45\n'
    '4,Bob\n'
)

class AuditError(Exception):
    """Expected safe error; does not include source text, path or row data."""


def warn_formula(text: str) -> bool:
    s = text.lstrip(" \t\r\n")
    if not s:
        return False
    if s[0] in ("=", "+", "@"): return True
    return s.startswith("-") and not SAFE_NUMERIC_MINUS.fullmatch(s)


def load_file(path: str) -> str:
    p=Path(path)
    try:
        # Never follow symlinks or read a device/pipe.
        if p.is_symlink() or not stat.S_ISREG(p.stat(follow_symlinks=False).st_mode):
            raise AuditError("Input must be an ordinary local CSV file, not a symlink or device.")
        if p.stat(follow_symlinks=False).st_size > MAX_BYTES:
            raise AuditError("CSV exceeds the 2 MiB local input cap.")
        with p.open("rb") as f:
            raw=f.read(MAX_BYTES + 1)
    except (OSError,ValueError) as exc:
        raise AuditError("Cannot read the local CSV file.") from None
    if len(raw)>MAX_BYTES:
        raise AuditError("CSV exceeds the 2 MiB local input cap.")
    try: return raw.decode("utf-8-sig",errors="strict")
    except UnicodeError:raise AuditError("CSV must contain valid UTF-8 text.") from None


def check(csv_text: str, demo: bool=False) -> dict:
    if not isinstance(csv_text,str):
        raise AuditError("Input must be UTF-8 text.")
    raw_len = len(csv_text.encode("utf-8"))
    if raw_len > MAX_BYTES:raise AuditError("CSV exceeds the 2 MiB local input cap.")
    if not csv_text.strip(): raise AuditError("CSV is empty.")
    reader = csv.reader(io.StringIO(csv_text,newline=""), delimiter=",", quotechar='"', doublequote=True, strict=True)
    old_limit=csv.field_size_limit()
    csv.field_size_limit(MAX_FIELD_BYTES)
    try:
        try: header = next(reader)
        except (StopIteration,csv.Error) as exc:
            raise AuditError("CSV header missing or malformed.") from None
        if not header:raise AuditError("CSV header is empty.")
        if len(header)>MAX_COLUMNS:raise AuditError("CSV exceeds 25 columns.")
        headcount=len(header)
        normalized_headers=[v.strip().casefold() for v in header]
        blankheaders=sum(not v for v in normalized_headers)
        seenheaders=set()
        dupheaders=0
        for h in normalized_headers:
            if not h:continue
            if h in seenheaders:dupheaders+=1
            else: seenheaders.add(h)
        seen=set()
        rows,ragged,shortrows,longrows,missing,duprows,formula=0,0,0,0,0,0,0
        try:
            for row in reader:
                rows+=1
                if rows>MAX_DATA_ROWS:raise AuditError("CSV exceeds 10,000 data records.")
                if len(row)!=headcount:
                    ragged+=1
                    if len(row)<headcount:shortrows+=1
                    else:longrows+=1
                missing+=sum(not v.strip() for v in row[:headcount])+max(headcount-len(row),0)
                formula+=sum(warn_formula(v) for v in row)
                # Length-prefixed JSON removes separator ambiguity; only digest kept.
                digest=hashlib.sha256(json.dumps(row,separators=(",",":"),ensure_ascii=False).encode("utf-8")).digest()
                if digest in seen:duprows+=1
                else:seen.add(digest)
        except csv.Error:raise AuditError("Malformed CSV quotation or field length.") from None
        if rows==0:raise AuditError("CSV has no data rows.")
        return {
           "ok":True,"kind":"fictional_local_demo" if demo else "local_private_input",
           "bytes":raw_len, "dataRows":rows, "columns":headcount,
           "raggedRows":ragged,"shortRows":shortrows,"longRows":longrows,
           "missingCells":missing,"duplicateRows":duprows,
           "duplicateHeaders":dupheaders,"blankHeaders":blankheaders,
           "formulaPrefixWarnings":formula,
           "localOnly":True,"uploadRequests":0,"walletSignatures":0,
           "chargedUSDC":"0",
           "limitations":"Structural warnings, not repair, type/schema correctness, malware screening, compliance certification or spreadsheet-formula escaping."
        }
    finally:
        csv.field_size_limit(old_limit)

def main(argv=None) -> int:
    parser=argparse.ArgumentParser(description="2 MiB local CSV structural QA, no upload/payment")
    choice=parser.add_mutually_exclusive_group(required=True)
    choice.add_argument("--demo",action="store_true",help="Test built-in entirely fictional sample")
    choice.add_argument("--file",type=str,help="Read a small authorized, non-confidential UTF-8 CSV")
    args=parser.parse_args(argv)
    try: result=check(FICTIONAL,True) if args.demo else check(load_file(args.file),False)
    except AuditError as err:
        result={"ok":False,"error":str(err),"localOnly":True,
                "uploadRequests":0,"walletSignatures":0,"chargedUSDC":"0"}
    print(json.dumps(result,ensure_ascii=False,separators=(",",":")))
    return 0 if result["ok"] else 2

if __name__=="__main__":sys.exit(main())
