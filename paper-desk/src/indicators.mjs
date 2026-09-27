// Plain technical indicators over candle arrays (oldest first).
export function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

export function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period; loss /= period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

export function atr(candles, period = 14) {
  if (candles.length <= period) return null;
  const tr = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    tr.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }
  let a = tr.slice(0, period).reduce((x, y) => x + y, 0) / period;
  for (let i = period; i < tr.length; i++) a = (a * (period - 1) + tr[i]) / period;
  return a;
}

export function stdev(xs) {
  if (xs.length < 2) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Everything the scanner and agents read, computed once per symbol per bar. */
export function snapshot(candles) {
  const closes = candles.map((c) => c.c);
  const last = candles.at(-1);
  const n = candles.length;
  const rets = [];
  for (let i = Math.max(1, n - 48); i < n; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const vols = candles.slice(-49, -1).map((c) => c.v);
  const vMean = vols.reduce((a, b) => a + b, 0) / (vols.length || 1);
  const vSd = stdev(vols) || 1;
  const window = candles.slice(-48);
  const day = n > 288 ? candles[n - 289].c : candles[0].c;
  return {
    t: last.t,
    price: last.c,
    change24hPct: ((last.c - day) / day) * 100,
    volume: last.v,
    volumeZ: (last.v - vMean) / vSd,
    volatilityPct: (stdev(rets) ?? 0) * Math.sqrt(288) * 100,   // daily-scaled volatility of 5m returns
    momentumPct: n > 12 ? ((last.c - closes[n - 13]) / closes[n - 13]) * 100 : 0, // 1h rate of change
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    rsi14: rsi(closes, 14),
    atr14: atr(candles, 14),
    support: Math.min(...window.map((c) => c.l)),
    resistance: Math.max(...window.map((c) => c.h)),
    lastRangeAtr: null,
  };
}
