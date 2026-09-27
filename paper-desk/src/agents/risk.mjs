// RISK: sets stop loss and take profit, can veto any trade, and halts the desk at the daily loss limit.
import { config } from "../config.mjs";

export const stopFor = (entry, atr) => entry - config.stopAtr * atr;
export const takeProfitFor = (entry, stop) => entry + config.takeProfitR * (entry - stop);

export const risk = {
  name: "RISK",
  role: "Stops, targets, vetoes, daily loss halt",
  run({ row, symbol, entry, sized, tape, wire, engine }) {
    const stop = stopFor(entry, row.atr14);
    const tp = takeProfitFor(entry, stop);
    const rr = (tp - entry) / (entry - stop);
    const vetoes = [];
    if (engine.halted) vetoes.push(`desk halted: daily loss limit ${config.dailyLossLimitPct * 100}% hit`);
    if (engine.hasExposure(symbol)) vetoes.push(`already exposed to ${symbol}`);
    if (engine.openCount() >= config.maxOpenPositions) vetoes.push(`max ${config.maxOpenPositions} open positions`);
    if (tape.verdict === "BEARISH") vetoes.push("TAPE is bearish");
    if (wire.verdict === "BLOCK") vetoes.push("WIRE blocked the signal");
    if (rr < config.minRewardRisk) vetoes.push(`reward/risk ${rr.toFixed(2)} < ${config.minRewardRisk}`);
    if (sized.output.pctOfEquity > config.maxPositionPct + 1e-9) vetoes.push("size above 10% cap");
    if (sized.output.qty <= 0) vetoes.push("zero size");
    if (row.volatilityPct > 15) vetoes.push(`volatility ${row.volatilityPct.toFixed(1)}%/day too high`);
    return {
      verdict: vetoes.length ? "VETO" : "APPROVE",
      summary: vetoes.length ? vetoes.join("; ") : `SL ${stop.toPrecision(6)} · TP ${tp.toPrecision(6)} · R:R ${rr.toFixed(2)}`,
      input: { entry, atr14: row.atr14, dayPnlPct: engine.dayPnlPct(), openPositions: engine.openCount(), halted: engine.halted },
      output: { stop, takeProfit: tp, rewardRisk: rr, vetoes },
    };
  },
};
