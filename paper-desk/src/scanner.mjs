// Market Scanner: measures every symbol and ranks them with a transparent rule score (0-100). It never decides a trade.
import { history } from "./market/dataset.mjs";
import { snapshot } from "./indicators.mjs";

export function scoreSymbol(s) {
  const parts = {
    trend: s.ema20 > s.ema50 ? 25 : 0,
    aboveEma: s.price > s.ema20 ? 15 : 0,
    momentum: Math.max(0, Math.min(20, s.momentumPct * 20)),       // +1% in 1h → full 20
    volume: Math.max(0, Math.min(15, s.volumeZ * 7.5)),             // +2σ volume → full 15
    rsi: s.rsi14 >= 45 && s.rsi14 <= 68 ? 15 : s.rsi14 > 68 && s.rsi14 <= 75 ? 5 : 0,
    volatility: s.volatilityPct >= 1 && s.volatilityPct <= 12 ? 10 : 0,
  };
  return { score: Math.round(Object.values(parts).reduce((a, b) => a + b, 0)), parts };
}

export function scan(dataset, i) {
  const rows = [];
  for (const sym of Object.keys(dataset.symbols)) {
    if (!dataset.symbols[sym][i]) continue;
    const h = history(dataset, sym, i, 300);
    if (h.length < 60) continue;
    const s = snapshot(h);
    const last = h.at(-1);
    s.lastRangeAtr = s.atr14 ? (last.h - last.l) / s.atr14 : null;
    const { score, parts } = scoreSymbol(s);
    rows.push({ symbol: sym, ...s, score, scoreParts: parts, spark: h.slice(-48).map((c) => c.c) });
  }
  return rows.sort((a, b) => b.score - a.score);
}
