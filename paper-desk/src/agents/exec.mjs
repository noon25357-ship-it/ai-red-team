// EXEC: places PAPER orders in the local engine. It has no network access and no exchange client, by design.
export const exec = {
  name: "EXEC",
  role: "Paper orders only (no exchange)",
  run({ engine, order }) {
    const o = engine.placeOrder(order);
    return {
      verdict: "PAPER_ORDER",
      summary: `${o.type} BUY ${o.qty.toPrecision(4)} ${o.symbol} @ ${o.price.toPrecision(6)} · paper order #${o.id}`,
      input: order,
      output: { orderId: o.id, status: o.status, venue: "PAPER (local ledger)" },
    };
  },
};
