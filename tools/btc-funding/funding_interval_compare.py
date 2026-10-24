#!/usr/bin/env python3
"""Compare *hypothetical* per-period BTC/USDT perpetual funding observations.

No network access, keys, client execution or payment. Comparing simple
rate-per-day arithmetic is NOT APY, an executable spread or a profit forecast.
All input quotes require verified source, settlement period and timestamps.
"""
from __future__ import annotations

import argparse
import datetime as dt
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path
import re
import sys

MAX_BYTES = 32_000
MAX_OBSERVATIONS = 8
MAX_AGE_SECONDS = 120
VENUE = re.compile(r"^[A-Za-z][A-Za-z0-9 ._-]{0,45}$")
REQUIRED = ("venue", "rateDecimal", "intervalHours", "observedAtUtc",
            "nextFundingUtc", "instrument")

def timestamp(value: str) -> dt.datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("timestamps must be UTC ISO 8601 strings ending in Z")
    try:
        parsed = dt.datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as exc:
        raise ValueError("invalid UTC timestamp") from exc
    if parsed.utcoffset() != dt.timedelta():
        raise ValueError("timestamp must use UTC")
    return parsed

def finite_decimal(value: str | int) -> Decimal:
    if not isinstance(value, str):
        raise ValueError("rates and intervals must be decimal strings")
    if not re.fullmatch(r"-?(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError("invalid decimal string")
    try:
        d = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("invalid decimal") from exc
    if not d.is_finite():
        raise ValueError("non-finite amount")
    return d

def analyze(input_data: dict, *, asof: dt.datetime) -> list[dict]:
    if not isinstance(input_data, dict):
        raise ValueError("expected JSON object")
    if input_data.get("exampleOnly") is not True:
        raise ValueError("only explicitly synthetic educational fixtures accepted")
    raw = input_data.get("observations")
    if not isinstance(raw, list) or not (1 <= len(raw) <= MAX_OBSERVATIONS):
        raise ValueError("expected 1 to 8 observation records")
    if asof.tzinfo is None or asof.utcoffset() != dt.timedelta():
        raise ValueError("asof must be UTC aware")
    seen = set()
    out = []
    for item in raw:
        if not isinstance(item, dict) or any(key not in item for key in REQUIRED):
            raise ValueError("invalid observation shape")
        name = item["venue"]
        if not isinstance(name, str) or not VENUE.fullmatch(name):
            raise ValueError("invalid venue label")
        if name.lower() in seen:
            raise ValueError("duplicate venue is not an independent observation")
        seen.add(name.lower())
        if item["instrument"] != "BTC/USDT USDT-margined perpetual":
            raise ValueError("instrument mismatch; not a comparable USDT perpetual")
        rate = finite_decimal(item["rateDecimal"])
        interval = finite_decimal(item["intervalHours"])
        if not (Decimal(-1)/10 <= rate <= Decimal(1)/10):
            raise ValueError("rate outside educational safety range")
        if interval not in (Decimal(1), Decimal(2), Decimal(4), Decimal(8), Decimal(12), Decimal(24)):
            raise ValueError("unsupported settlement interval; verify exact venue spec")
        observed = timestamp(item["observedAtUtc"])
        next_funding = timestamp(item["nextFundingUtc"])
        if not observed < next_funding:
            raise ValueError("next funding must follow observation")
        age = (asof - observed).total_seconds()
        if age < -60:
            raise ValueError("quote lies more than 60 sec in future")
        bps = rate * 10000
        simple_bps_24 = bps * Decimal(24) / interval
        out.append({
            "venue": name,
            "instrument": item["instrument"],
            "bpsPerSettlement": f"{bps:.4f}",
            "intervalHours": int(interval),
            "simpleBpsPer24hIllustration": f"{simple_bps_24:.4f}",
            "observedAtUtc": item["observedAtUtc"],
            "nextFundingUtc": item["nextFundingUtc"],
            "ageSeconds": int(age),
            "freshAtAsOf": 0 <= age <= MAX_AGE_SECONDS,
            "qualifier": "SYNTHETIC: no live price, APY, trading instruction or guaranteed funding"
        })
    return out

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True, help="synthetic JSON fixture only")
    ap.add_argument("--asof", required=True, help="UTC ISO timestamp ending Z")
    ap.add_argument("--output", choices=("markdown", "json"), default="markdown")
    args = ap.parse_args(argv)
    path = Path(args.input)
    if path.stat().st_size > MAX_BYTES:
        ap.error("input larger than 32 kB")
    try:
        data = json.loads(path.read_text("utf-8"))
        rows = analyze(data, asof=timestamp(args.asof))
    except (ValueError, json.JSONDecodeError, UnicodeError) as exc:
        ap.error(str(exc))
    if args.output == "json":
        print(json.dumps({"exampleOnly": True, "asofUtc": args.asof, "observations": rows}, indent=2))
    else:
        print("SYNTHETIC DEMONSTRATION ONLY — no real market quote or expected profit")
        print("| Venue | Bps per settlement | Interval (h) | Simple 24h illustration (bps) | Age (s) | Fresh? |")
        print("| --- | ---: | ---: | ---: | ---: | :---: |")
        for r in rows:
            print(f"| {r['venue']} | {r['bpsPerSettlement']} | {r['intervalHours']} "
                  f"| {r['simpleBpsPer24hIllustration']} | {r['ageSeconds']} "
                  f"| {'yes' if r['freshAtAsOf'] else 'NO'} |")
        print("Illustration assumes repeated identical rates with no fees, price changes,")
        print("position financing, liquidation, caps or compounding. NOT annual yield.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
