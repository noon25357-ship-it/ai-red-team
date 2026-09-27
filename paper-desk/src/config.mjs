// Desk settings. Paper only: there is no setting that enables real trading.
export const config = {
  startingBalance: 1000,
  // Paper balance per quote currency. BTC-quoted data gets a BTC account; nothing is converted to USD.
  startingBalanceByQuote: { USDT: 1000, BTC: 0.1 },
  feeRate: 0.001,             // 0.1% per side, like Binance spot taker
  slippage: 0.0002,           // 0.02% on market fills
  maxPositionPct: 0.10,       // hard cap: position notional ≤ 10% of equity
  riskPerTradePct: 0.01,      // size so a stop-out loses ≤ 1% of equity (then capped at 10% notional)
  dailyLossLimitPct: 0.03,    // RISK halts the desk for the rest of the UTC day below -3% of day-start equity
  maxOpenPositions: 3,
  stopAtr: 1.5,               // stop loss = entry − 1.5 × ATR(14)
  takeProfitR: 2,             // take profit at 2R
  minRewardRisk: 1.8,
  maxHoldBars: 48,            // time stop: 4 hours of 5m candles
  limitOrderBars: 6,          // unfilled limit orders expire after 30 minutes
  decisionEveryBars: 3,       // one decision cycle per symbol every 15 minutes
  warmupBars: 300,            // history loaded before the first decision
  scannerMinScore: 60,
  demo: { dataset: "binance-2025-11-usdt", bars: 420, barsPerSecond: 24, agentStepMs: 45 },
  port: Number(process.env.PAPER_DESK_PORT ?? 4180),
};
