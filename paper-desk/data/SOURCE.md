# Market data

Real historical candles only. Nothing here is generated, resampled, or edited.

| File | Contents |
|---|---|
| `binance-2025-11-usdt.json.gz` | Binance spot BTC/USDT and XRP/USDT, 5-minute OHLCV, 2025-11-24 00:00 → 2025-12-04 18:45 UTC (3,106 candles each) |
| `binance-2018-01-btc.json.gz` | Binance spot ETH, ADA, LTC, XMR, DASH, ETC, XLM, TRX, ZEC quoted in BTC, 5-minute OHLCV, 2018-01-10 → 2018-01-30 UTC (~5,760 candles each) |

Source: Binance public market data as shipped in freqtrade's test fixtures, `tests/testdata/*.feather`
(github.com/freqtrade/freqtrade, commit `d6c736fc1797b453b88e6370a556d6a7cafa0220`, GPL-3.0).
Converted with `scripts/import_freqtrade_data.py`.

The 2018 set is quoted in BTC; its paper account is denominated in BTC, with no USD conversion.
