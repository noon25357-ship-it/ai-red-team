# JEV Paper Desk

A paper-trading desk: a market scanner, six single-purpose agents, a risk engine, and JEV as the final decision layer.
**Paper only.** There is no exchange client, no order-signing code, and no exchange key anywhere; see *Safety*.

```sh
cd paper-desk
npm install
npm start            # http://localhost:4180 → RUN DEMO or REPLAY
npm run demo         # same, and starts RUN DEMO on page load (?autodemo=1)
npm run record-demo  # headless 1600×900 recording of RUN DEMO → runs/demo/*.webm (+ mid/final screenshots)
npm run jev:status   # what JEV needs, without printing secrets
npm test             # safety, engine, JEV adapter, end-to-end demo session
```

## Flow

`MARKET → JEV → AGENTS → RISK → PAPER ORDER`, one decision cycle per symbol every 15 minutes of market time.

1. **Market Scanner**: price, 24h change, volume z-score, daily-scaled volatility, 1h momentum, EMA20/50, RSI14, ATR14, 4h support/resistance, and a transparent 0-100 rule score.
2. **Filter**: JEV picks the best candidate or none and answers `APPROVE / REJECT / HUMAN_REVIEW` (only asked when the scanner finds a symbol scoring ≥ 60, to save calls).
3. **Agents**: TAPE (trend, volume, momentum, S/R), PRICE (entry, never chases: extended moves get a pullback limit), WIRE (news/social feed **NOT CONNECTED**, market-integrity checks on the candles), SIZE (1% risk per trade, hard cap 10% of equity), RISK (stop 1.5 ATR, target 2R, vetoes, daily loss halt at −3%), EXEC (paper orders into the local ledger).
4. **Final decision**: JEV answers `BUY / HOLD / SKIP` over all agent outputs; RISK keeps its veto.
5. **Paper engine**: starts at $1,000 (₿0.1 for BTC-quoted data). Market orders fill at the next candle's open + 0.02% slippage, limits when price trades through, 0.1% fee per side; stop is assumed first if stop and target sit in one candle; 4h time stop.

## JEV

`src/jev/adapter.mjs` is the only place that talks to JEV. At start it checks for `TYPESAFE_API_KEY` and network access to `api.typesafe.ai`.

- **Connected**: filter and final decision come from JEV (`systemOne`), with its confidence, latency and model shown.
- **Not connected** (today): every JEV surface says **JEV: NOT CONNECTED** and lists what is missing. The desk still runs, decided by a **RULES gate** (TAPE bullish, WIRE not blocking, RISK approving), labelled `RULES · JEV NOT CONNECTED` on every decision. No JEV decision, confidence, or latency is ever shown unless JEV returned it.

To connect: set `TYPESAFE_API_KEY` (environment or `../.env`) and allow `api.typesafe.ai`. Nothing else changes.

## Data

`DATA MODE: REPLAY` only. The container cannot reach any market-data host, so the desk replays **real** Binance 5m candles bundled in `data/` (see `data/SOURCE.md`): BTC/USDT and XRP/USDT (Nov-Dec 2025), and nine altcoins quoted in BTC (Jan 2018). RUN DEMO replays 420 candles of the 2025 set, the window with the highest market activity (chosen by volatility, not by result), at 24 candles/s.

## Safety

- `src/safety.mjs` wraps `fetch`: only `api.typesafe.ai` (JEV) and read-only `data-api.binance.vision` market-data paths are reachable; anything else, any non-GET to market data, and any order endpoint is refused before I/O.
- The process refuses to start if exchange credential variables (`BINANCE_*KEY`, `COINBASE_*SECRET`, …) are set.
- A test scans every source file for exchange order or signing code.

## Output

Every session is saved to `runs/<mode>-<time>.json`: balance, metrics (ROI, win rate, max drawdown, profit factor), every trade with entry/exit time and PnL, the equity curve, every agent run with input/output/latency, every filter and final decision, and every risk action.

## Honest results

The rules gate is a plain baseline, not a tuned strategy. On the full bundled history it loses: −2.96% over 10 days on the 2025 set (105 trades, 27.6% win rate) and −14.8% over 20 days on the 2018 set. It is deliberately not fitted to this data; the final decision belongs to JEV once connected.
