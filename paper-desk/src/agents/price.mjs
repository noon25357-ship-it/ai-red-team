// PRICE: picks an entry and refuses to chase. Extended moves get a pullback limit order instead of a market buy.
export const price = {
  name: "PRICE",
  role: "Entry point without chasing",
  run({ row }) {
    const a = row.atr14;
    const ext = (row.price - row.ema20) / a;
    const nearRes = (row.resistance - row.price) / a < 0.5;
    let orderType = "MARKET", entry = row.price, why = "Price is close to EMA20; market entry at next open";
    if (ext > 1) { orderType = "LIMIT"; entry = row.ema20 + 0.25 * a; why = `Extended ${ext.toFixed(1)} ATR above EMA20; wait for pullback`; }
    else if (nearRes) { orderType = "LIMIT"; entry = row.price - 0.5 * a; why = "Under resistance; limit 0.5 ATR lower"; }
    return {
      verdict: orderType === "MARKET" ? "ENTER" : "PULLBACK",
      summary: `${orderType} @ ${entry.toPrecision(6)} · ${why}`,
      input: { price: row.price, ema20: row.ema20, atr14: a, resistance: row.resistance },
      output: { orderType, entry, extensionAtr: ext },
    };
  },
};
