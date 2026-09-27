// TAPE: reads trend, volume, momentum, and support/resistance. Rule-based; its strength is a rule score, not AI confidence.
export const tape = {
  name: "TAPE",
  role: "Trend, volume, momentum, support/resistance",
  run({ row }) {
    const up = row.ema20 > row.ema50, above = row.price > row.ema20;
    const toRes = row.atr14 ? (row.resistance - row.price) / row.atr14 : null;
    const toSup = row.atr14 ? (row.price - row.support) / row.atr14 : null;
    const parts = [up ? 30 : 0, above ? 20 : 0, Math.max(0, Math.min(25, row.momentumPct * 25)), Math.max(0, Math.min(15, row.volumeZ * 7.5)), toRes != null && toRes > 1 ? 10 : 0];
    const strength = Math.round(parts.reduce((a, b) => a + b, 0));
    const verdict = up && above && row.momentumPct > 0 ? "BULLISH" : !up && !above ? "BEARISH" : "NEUTRAL";
    return {
      verdict, strength,
      summary: `${up ? "EMA20 > EMA50" : "EMA20 < EMA50"}, ${above ? "above" : "below"} EMA20, 1h ${row.momentumPct >= 0 ? "+" : ""}${row.momentumPct.toFixed(2)}%, vol ${row.volumeZ >= 0 ? "+" : ""}${row.volumeZ.toFixed(1)}σ`,
      input: { price: row.price, ema20: row.ema20, ema50: row.ema50, momentumPct: row.momentumPct, volumeZ: row.volumeZ, support: row.support, resistance: row.resistance },
      output: { trend: up ? "UP" : "DOWN", distanceToResistanceAtr: toRes, distanceToSupportAtr: toSup },
    };
  },
};
