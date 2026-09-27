// WIRE: screens for unreliable or dangerous signals. The news/social feed is NOT CONNECTED (no source configured),
// so only market-integrity checks on the candles run. Its status says so.
export const wire = {
  name: "WIRE",
  role: "News/social + market-integrity risk signals",
  partial: "News/social feed NOT CONNECTED; market-integrity checks only",
  run({ row, prevClose }) {
    const flags = [];
    if (row.lastRangeAtr > 4) flags.push(`last candle range ${row.lastRangeAtr.toFixed(1)}× ATR (spike)`);
    if (row.volumeZ > 5) flags.push(`volume ${row.volumeZ.toFixed(1)}σ above normal (pump risk)`);
    const jump = prevClose ? Math.abs(row.price / prevClose - 1) * 100 : 0;
    if (jump > 3) flags.push(`${jump.toFixed(1)}% move in one candle`);
    if (row.volatilityPct > 15) flags.push(`volatility ${row.volatilityPct.toFixed(1)}%/day`);
    const verdict = flags.length >= 2 ? "BLOCK" : flags.length === 1 ? "CAUTION" : "CLEAR";
    return {
      verdict,
      summary: flags.length ? flags.join("; ") : "No market-integrity flags · news feed not connected",
      input: { lastRangeAtr: row.lastRangeAtr, volumeZ: row.volumeZ, oneCandleMovePct: jump, volatilityPct: row.volatilityPct },
      output: { flags, news: "NOT CONNECTED" },
    };
  },
};
