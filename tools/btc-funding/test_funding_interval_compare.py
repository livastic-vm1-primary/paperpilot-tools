from pathlib import Path
import copy
import datetime as dt
import importlib.util
import json
import unittest

DIR = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("funding_synthetic_comparison", DIR/"funding_interval_compare.py")
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SRC = json.loads((DIR/"synthetic_funding_input.json").read_text())
ASOF = module.timestamp("2026-10-24T08:01:00Z")

class TestSyntheticFundingInterval(unittest.TestCase):
    def test_01_four_distinct_fixture_venues(self):
        rows = module.analyze(SRC, asof=ASOF)
        self.assertEqual([r["venue"] for r in rows], ["Binance","Bybit","OKX","Bitget"])
    def test_02_bps_are_decimal_not_percentage(self):
        rows = module.analyze(SRC, asof=ASOF)
        self.assertEqual([r["bpsPerSettlement"] for r in rows],
                         ["1.0000","0.8000","-0.2000","0.2500"])
    def test_03_period_normalized_does_not_claim_apy(self):
        rows = module.analyze(SRC, asof=ASOF)
        self.assertEqual([r["simpleBpsPer24hIllustration"] for r in rows],
                         ["3.0000","4.8000","-0.6000","6.0000"])
        self.assertTrue(all("APY" in r["qualifier"] for r in rows))
    def test_04_no_fake_live_data_claim(self):
        self.assertTrue(all(r["freshAtAsOf"] for r in module.analyze(SRC,asof=ASOF)))
    def test_05_staleness_detected(self):
        rows = module.analyze(SRC,asof=module.timestamp("2026-10-24T08:04:00Z"))
        self.assertFalse(any(r["freshAtAsOf"] for r in rows))
    def test_06_past_asof_fails_future_quote(self):
        with self.assertRaises(ValueError):
            module.analyze(SRC,asof=module.timestamp("2026-10-24T07:58:00Z"))
    def test_07_unknown_real_data_without_synthetic_label_fails(self):
        d=copy.deepcopy(SRC); d["exampleOnly"]=False
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_08_no_duplicate_venues(self):
        d=copy.deepcopy(SRC);d["observations"][1]["venue"]="binance"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_09_no_other_contract_types(self):
        d=copy.deepcopy(SRC);d["observations"][1]["instrument"]="BTC/USD coin margin"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_10_no_nan_nonfinite_rate(self):
        d=copy.deepcopy(SRC);d["observations"][1]["rateDecimal"]="NaN"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_11_no_zero_interval(self):
        d=copy.deepcopy(SRC);d["observations"][1]["intervalHours"]="0"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_12_no_fractional_fake_interval(self):
        d=copy.deepcopy(SRC);d["observations"][1]["intervalHours"]="2.5"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_13_no_non_utc_time(self):
        d=copy.deepcopy(SRC);d["observations"][1]["observedAtUtc"]="2026-10-24T08:00:00+09:00"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_14_no_prior_next_funding(self):
        d=copy.deepcopy(SRC);d["observations"][1]["nextFundingUtc"]="2026-10-23T08:00:00Z"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_15_no_bad_venue_label(self):
        d=copy.deepcopy(SRC);d["observations"][1]["venue"]="</script>"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_16_no_outlandish_rate(self):
        d=copy.deepcopy(SRC);d["observations"][1]["rateDecimal"]="9.000"
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_17_no_many_inputs(self):
        d=copy.deepcopy(SRC);d["observations"]*=3
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_18_no_missing_input(self):
        d=copy.deepcopy(SRC);del d["observations"][0]["rateDecimal"]
        with self.assertRaises(ValueError):module.analyze(d,asof=ASOF)
    def test_19_no_naive_reference_time(self):
        with self.assertRaises(ValueError):
            module.analyze(SRC,asof=dt.datetime(2026,10,24,8,1,0))
    def test_20_signed_negative_rate_retained(self):
        row=module.analyze(SRC,asof=ASOF)[2]
        self.assertEqual(row["bpsPerSettlement"],"-0.2000")
        self.assertEqual(row["simpleBpsPer24hIllustration"],"-0.6000")

if __name__=="__main__":
    unittest.main(verbosity=2)
