// SIZE: sizes the paper position from risk, hard-capped at 10% of equity.
import { config } from "../config.mjs";

export const size = {
  name: "SIZE",
  role: "Position size from risk (≤ 10% of balance)",
  run({ equity, entry, stop }) {
    const perUnitRisk = entry - stop;
    const riskBudget = equity * config.riskPerTradePct;
    const byRisk = perUnitRisk > 0 ? riskBudget / perUnitRisk : 0;
    const byCap = (equity * config.maxPositionPct) / entry;
    const qty = Math.max(0, Math.min(byRisk, byCap));
    const notional = qty * entry;
    return {
      verdict: qty > 0 ? "SIZED" : "ZERO",
      summary: `${qty.toPrecision(4)} units · ${notional.toFixed(2)} notional (${((notional / equity) * 100).toFixed(1)}% of equity)${byCap < byRisk ? " · capped at 10%" : ""}`,
      input: { equity, entry, stop, riskPerTradePct: config.riskPerTradePct, maxPositionPct: config.maxPositionPct },
      output: { qty, notional, pctOfEquity: notional / equity, riskAtStop: qty * perUnitRisk, capped: byCap < byRisk },
    };
  },
};
