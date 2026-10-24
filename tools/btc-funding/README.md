# Four funding observations, four clocks (offline educational demo)

A small Python 3/standard-library-only, non-trading and non-networking tool
from the single original owner of PaperPilot Tools. Its only inputs are
explicitly synthetic BTC/USDT, USDT-margined perpetual observations.
It never retrieves exchange prices, asks for any account/API key, holds funds,
signs crypto transactions, submits orders or handles leverage.

The 20 tests check quote identity, rate/interval arithmetic, UTC timestamps,
funding date ordering, input caps, staleness, impossible rates and disclosure.

## Try it

    python3 -B tools/btc-funding/funding_interval_compare.py \
      --input tools/btc-funding/synthetic_funding_input.json \
      --asof 2026-10-24T08:01:00Z

For JSON:

    python3 -B tools/btc-funding/funding_interval_compare.py \
      --input tools/btc-funding/synthetic_funding_input.json \
      --asof 2026-10-24T08:01:00Z --output json

Regression tests:

    python3 -B -m unittest discover \
      -s tools/btc-funding -p 'test_*.py' -q

Expected artificial fixture arithmetic:

| Venue | Example per-period bps | Example interval hours | Simple 24-hour extrapolation bps |
| --- | ---: | ---: | ---: |
| Binance | +1.0000 | 8 | +3.0000 |
| Bybit | +0.8000 | 4 | +4.8000 |
| OKX | -0.2000 | 8 | -0.6000 |
| Bitget | +0.2500 | 1 | +6.0000 |

These are fabricated numbers selected only to show that a per-period
rate cannot be compared without its period. Simple extrapolation here is
fundingRateDecimal times 10000 times (24 divided by intervalHours), not APY,
a backtested return, compound yield, a market spread or any profit forecast.
It omits venue fees, account funding, collateral risk, slippage, mark price
differences, hedging costs, liquidation, funding caps, changing rates,
position eligibility and exchange outages. No example indicates that the
named exchange currently uses that illustrated settlement interval for BTC/USDT.

Sources for real metadata semantics, not for those example rates:

- Binance Futures funding-rate introduction (default 8 hours can change):
  https://www.binance.com/en/support/faq/detail/360033525031
- Binance USD-M REST funding info, fundingIntervalHours when adjusted:
  https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Get-Funding-Info
- Bybit V5 market instruments, fundingInterval in minutes:
  https://bybit-exchange.github.io/docs/v5/market/instrument
- OKX public funding rate, fundingTime, nextFundingTime:
  https://www.okx.com/docs-v5/en/#rest-api-public-data-get-funding-rate
- Bitget current funding rate, fundingRateInterval in hours:
  https://www.bitget.com/legacy-docs/uta/public/Get-Current-Funding-Rate

Why publish a free tool? For a transparent usage example of the separately
paid, read-only PaperPilot BTC/USDT four-source data product:
https://livastic-vm1-primary.github.io/paperpilot-tools/btc-funding-x402-data.html

The PayAPI marketplace operator completed one paid technical verification
at 0.01 native Base Circle USDC on 2026-10-24, not independent recurring
customer demand. This optional paid API is not called by this free program.
It does not guarantee trade-data accuracy, access from every country,
or any investment outcome. All work is AI-assisted and reviewed in a
single-owner VM1 environment. No affiliate or referral data collection.
