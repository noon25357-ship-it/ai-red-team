// Paper Trading Engine: a local ledger. Orders fill against the next real candle; nothing leaves this process.
import { config } from "../config.mjs";

const dayOf = (t) => Math.floor(t / 86400);

export class PaperEngine {
  constructor({ startingBalance = config.startingBalance, quote = "USDT" } = {}) {
    this.quote = quote;
    this.start = startingBalance;
    this.cash = startingBalance;
    this.positions = new Map();   // symbol → position
    this.orders = [];             // pending paper orders
    this.trades = [];             // closed trades
    this.equityCurve = [];        // { t, equity }
    this.riskActions = [];
    this.lastPrice = {};
    this.peak = startingBalance;
    this.maxDrawdownPct = 0;
    this.day = null;
    this.dayStartEquity = startingBalance;
    this.halted = false;
    this.nextId = 1;
  }

  equity() {
    let e = this.cash;
    for (const p of this.positions.values()) e += p.qty * (this.lastPrice[p.symbol] ?? p.entry);
    return e;
  }
  hasExposure(sym) { return this.positions.has(sym) || this.orders.some((o) => o.symbol === sym); }
  openCount() { return this.positions.size + this.orders.length; }
  dayPnl() { return this.equity() - this.dayStartEquity; }
  dayPnlPct() { return this.dayPnl() / this.dayStartEquity; }

  placeOrder({ symbol, type, price, qty, stop, takeProfit, bar, t }) {
    if (!(qty > 0)) throw new Error("Paper order needs a positive quantity");
    const o = { id: this.nextId++, symbol, side: "BUY", type, price, qty, stop, takeProfit, createdBar: bar, createdT: t, expiresBar: bar + config.limitOrderBars, status: "PENDING" };
    this.orders.push(o);
    return o;
  }

  #close(p, exitPrice, reason, bar, t) {
    const gross = p.qty * exitPrice;
    const fee = gross * config.feeRate;
    this.cash += gross - fee;
    const pnl = gross - fee - p.cost;
    const trade = {
      id: p.id, symbol: p.symbol, side: "LONG", qty: p.qty,
      entry: p.entry, exit: exitPrice, stop: p.stop, takeProfit: p.takeProfit,
      entryT: p.entryT, exitT: t, entryBar: p.entryBar, exitBar: bar,
      fees: p.entryFee + fee, pnl, pnlPct: pnl / p.cost, result: pnl > 0 ? "WIN" : "LOSS", reason,
    };
    this.trades.push(trade);
    this.positions.delete(p.symbol);
    return trade;
  }

  /** Advance one candle. Returns what happened: fills, exits, expiries, risk actions. */
  onBar(bar, t, candles) {
    const events = [];
    for (const [sym, c] of Object.entries(candles)) if (c) this.lastPrice[sym] = c.o;

    // New UTC day: reset the daily baseline; a halt lasts only for the day it was triggered.
    if (dayOf(t) !== this.day) {
      if (this.day !== null && this.halted) {
        this.halted = false;
        const a = { t, action: "RESUME", reason: "New UTC day: daily loss limit resets" };
        this.riskActions.push(a); events.push({ type: "risk_action", ...a });
      }
      this.day = dayOf(t);
      this.dayStartEquity = this.equity();
    }

    // Pending orders: fill against this candle or expire.
    for (const o of [...this.orders]) {
      const c = candles[o.symbol];
      if (!c || bar <= o.createdBar) continue;
      let fill = null;
      if (o.type === "MARKET") fill = c.o * (1 + config.slippage);
      else if (c.l <= o.price) fill = Math.min(c.o, o.price);
      if (fill != null) {
        const cost = o.qty * fill, fee = cost * config.feeRate;
        this.cash -= cost + fee;
        this.positions.set(o.symbol, { id: o.id, symbol: o.symbol, qty: o.qty, entry: fill, stop: o.stop, takeProfit: o.takeProfit, entryBar: bar, entryT: t, entryFee: fee, cost: cost + fee });
        this.orders.splice(this.orders.indexOf(o), 1);
        events.push({ type: "fill", orderId: o.id, symbol: o.symbol, price: fill, qty: o.qty, fee, orderType: o.type });
      } else if (bar >= o.expiresBar) {
        this.orders.splice(this.orders.indexOf(o), 1);
        events.push({ type: "order_expired", orderId: o.id, symbol: o.symbol, price: o.price });
      }
    }

    // Exits from the candle after entry. If stop and target are both inside one candle, the stop is assumed first.
    for (const p of [...this.positions.values()]) {
      const c = candles[p.symbol];
      if (!c || bar <= p.entryBar) continue;
      let exit = null, reason = null;
      if (c.o <= p.stop) { exit = c.o; reason = "STOP (gap)"; }
      else if (c.l <= p.stop) { exit = p.stop; reason = "STOP"; }
      else if (c.o >= p.takeProfit) { exit = c.o; reason = "TAKE PROFIT (gap)"; }
      else if (c.h >= p.takeProfit) { exit = p.takeProfit; reason = "TAKE PROFIT"; }
      else if (bar - p.entryBar >= config.maxHoldBars) { exit = c.c; reason = "TIME STOP"; }
      if (exit != null) events.push({ type: "exit", ...this.#close(p, exit, reason, bar, t) });
    }

    for (const [sym, c] of Object.entries(candles)) if (c) this.lastPrice[sym] = c.c;

    // RISK: daily loss limit halts the desk and closes everything at this close.
    if (!this.halted && this.dayPnlPct() <= -config.dailyLossLimitPct) {
      this.halted = true;
      for (const p of [...this.positions.values()]) events.push({ type: "exit", ...this.#close(p, this.lastPrice[p.symbol], "RISK HALT", bar, t) });
      for (const o of this.orders.splice(0)) events.push({ type: "order_cancelled", orderId: o.id, symbol: o.symbol, reason: "RISK HALT" });
      const a = { t, action: "HALT", reason: `Daily loss ${(this.dayPnlPct() * 100).toFixed(2)}% hit the −${config.dailyLossLimitPct * 100}% limit; positions closed, no new trades today` };
      this.riskActions.push(a); events.push({ type: "risk_action", ...a });
    }

    const eq = this.equity();
    this.equityCurve.push({ t, equity: eq });
    this.peak = Math.max(this.peak, eq);
    this.maxDrawdownPct = Math.max(this.maxDrawdownPct, (this.peak - eq) / this.peak);
    return events;
  }

  metrics() {
    const eq = this.equity();
    const wins = this.trades.filter((t) => t.pnl > 0);
    const grossWin = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLoss = -this.trades.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0);
    return {
      quote: this.quote, startingBalance: this.start, equity: eq, cash: this.cash,
      roiPct: ((eq - this.start) / this.start) * 100,
      dayPnl: this.dayPnl(), dayPnlPct: this.dayPnlPct() * 100,
      trades: this.trades.length, wins: wins.length, losses: this.trades.length - wins.length,
      winRatePct: this.trades.length ? (wins.length / this.trades.length) * 100 : null,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
      maxDrawdownPct: this.maxDrawdownPct * 100,
      openPositions: [...this.positions.values()].map((p) => ({ ...p, mark: this.lastPrice[p.symbol], upnl: p.qty * this.lastPrice[p.symbol] - p.cost })),
      pendingOrders: this.orders.map((o) => ({ ...o })),
      halted: this.halted,
    };
  }
}
