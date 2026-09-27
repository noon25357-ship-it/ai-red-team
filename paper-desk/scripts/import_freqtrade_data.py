"""Convert real Binance 5m candles shipped in freqtrade's tests/testdata into compact JSON datasets.

Usage: python3 import_freqtrade_data.py <path-to-freqtrade>/tests/testdata <out-dir>
Needs pandas + pyarrow. Prices are copied as-is; nothing is generated or resampled.
"""
import json, sys, pathlib
import pandas as pd

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
SETS = {
    "binance-2025-11-usdt": {
        "title": "Binance spot · BTC/USDT, XRP/USDT · 5m · 2025-11-24 → 2025-12-04",
        "quote": "USDT", "files": ["BTC_USDT-5m", "XRP_USDT-5m"],
    },
    "binance-2018-01-btc": {
        "title": "Binance spot · 9 altcoins vs BTC · 5m · 2018-01-10 → 2018-01-30",
        "quote": "BTC", "files": ["ETH_BTC-5m", "ADA_BTC-5m", "LTC_BTC-5m", "XMR_BTC-5m", "DASH_BTC-5m", "ETC_BTC-5m", "XLM_BTC-5m", "TRX_BTC-5m", "ZEC_BTC-5m"],
    },
}
for key, meta in SETS.items():
    symbols = {}
    for f in meta["files"]:
        d = pd.read_feather(src / f"{f}.feather").sort_values("date")
        sym = f.split("-")[0].replace("_", "/")
        symbols[sym] = [[int(r.date.timestamp()), r.open, r.high, r.low, r.close, round(r.volume, 4)] for r in d.itertuples()]
    doc = {
        "id": key, "title": meta["title"], "quote": meta["quote"], "interval": "5m",
        "source": "Binance public spot klines, as shipped in freqtrade tests/testdata (github.com/freqtrade/freqtrade, GPL-3.0)",
        "columns": ["time", "open", "high", "low", "close", "volume"], "symbols": symbols,
    }
    (out / f"{key}.json").write_text(json.dumps(doc, separators=(",", ":")))
    print(key, {s: len(v) for s, v in symbols.items()})
