// The desk: replays real candles bar by bar and runs Scan → Filter → Agents → Risk → Decision → Paper order.
// JEV is the final decision layer when connected. When it is not, the desk says so and a transparent rules gate
// decides instead, labelled RULES everywhere; nothing is ever attributed to JEV that JEV did not answer.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.mjs";
import { loadDataset } from "./market/dataset.mjs";
import { scan } from "./scanner.mjs";
import { PaperEngine } from "./engine/paper-engine.mjs";
import { AGENTS, runAgent } from "./agents/index.mjs";
import { stopFor } from "./agents/risk.mjs";
import { jevStatus, jevFilter, jevDecide } from "./jev/adapter.mjs";
import { SAFETY_SUMMARY } from "./safety.mjs";

export const RUNS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "runs");
const [TAPE, PRICE, WIRE, SIZE, EXEC, RISK] = AGENTS;
const TEMPORARY_VETO = /already exposed|max \d+ open|desk halted/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pick a demo window by market activity (mean absolute 5m return), never by trading result. */
export function activityWindow(ds, length) {
  const syms = Object.keys(ds.symbols);
  let best = { start: config.warmupBars, activity: -1 };
  for (let s = config.warmupBars; s + length < ds.length; s += 12) {
    let sum = 0, n = 0;
    for (const sym of syms) {
      const a = ds.symbols[sym];
      for (let i = s + 1; i < s + length; i += 3) if (a[i] && a[i - 1]) { sum += Math.abs(Math.log(a[i].c / a[i - 1].c)); n++; }
    }
    const act = sum / (n || 1);
    if (act > best.activity) best = { start: s, activity: act };
  }
  return best;
}

export async function runSession({ datasetId, from, to, barsPerSecond = 0, agentStepMs = 0, emit = () => {}, signal, mode = "REPLAY", label }) {
  const ds = await loadDataset(datasetId);
  const startBar = Math.max(from ?? config.warmupBars, 60);
  const endBar = Math.min(to ?? ds.length - 1, ds.length - 1);
  const engine = new PaperEngine({ quote: ds.quote, startingBalance: config.startingBalanceByQuote[ds.quote] ?? config.startingBalance });
  const runId = `${mode.toLowerCase()}-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-")}`;
  const log = { decisions: [], agentRuns: [], riskActions: engine.riskActions, filters: [] };
  const jev = jevStatus();
  const syms = Object.keys(ds.symbols);
  const candlesAt = (i) => Object.fromEntries(syms.map((s) => [s, ds.symbols[s][i]]));
  const out = (e) => emit(e);

  out({
    type: "session_start", runId, mode, label, dataMode: "REPLAY",
    dataset: { id: ds.id, title: ds.title, quote: ds.quote, source: ds.source, interval: ds.interval },
    window: { from: startBar, to: endBar, startT: ds.times[startBar], endT: ds.times[endBar] },
    jev, safety: SAFETY_SUMMARY,
    config: { startingBalance: engine.start, maxPositionPct: config.maxPositionPct, dailyLossLimitPct: config.dailyLossLimitPct, riskPerTradePct: config.riskPerTradePct, maxOpenPositions: config.maxOpenPositions },
    agents: AGENTS.map((a) => ({ name: a.name, role: a.role, partial: a.partial ?? null })),
    history: Object.fromEntries(syms.map((s) => [s, ds.symbols[s].slice(Math.max(0, startBar - 150), startBar).filter(Boolean)])),
  });

  let stopped = false;
  const t0 = Date.now();
  for (let i = startBar; i <= endBar; i++) {
    if (signal?.aborted) { stopped = true; break; }
    if (barsPerSecond > 0) {
      const due = t0 + ((i - startBar) / barsPerSecond) * 1000;
      const wait = due - Date.now();
      if (wait > 0) await sleep(wait);
    }
    const t = ds.times[i];
    const candles = candlesAt(i);
    const events = engine.onBar(i, t, candles);
    for (const e of events) out({ ...e, t, bar: i });
    const m = engine.metrics();
    out({ type: "tick", t, bar: i, candles, equity: m.equity, metrics: m });

    if ((i - startBar) % config.decisionEveryBars !== 0 || engine.halted) continue;

    // 1. Market Scanner
    const rows = scan(ds, i);
    out({ type: "scan", t, bar: i, rows: rows.map(({ scoreParts, ...r }) => r) });

    // 2. Filter: JEV when connected (only asked when the rules pre-filter finds something), otherwise the rules filter.
    const eligible = rows.filter((r) => r.score >= config.scannerMinScore && !engine.hasExposure(r.symbol));
    if (!eligible.length) continue;
    let candidate = null, filter;
    if (jev.state === "CONNECTED") {
      const f = await jevFilter(rows);
      const pick = f.answers.candidate.decision, verdict = f.answers.verdict.decision;
      filter = { source: "JEV", verdict, pick, confidence: f.answers.verdict.confidence, latencyMs: f.latencyMs, model: f.model };
      if (verdict === "APPROVE" && pick !== "NONE") candidate = rows.find((r) => r.symbol === pick);
    } else {
      candidate = eligible[0];
      filter = { source: "RULES", jev: "NOT_CONNECTED", verdict: "PASS", pick: candidate.symbol, reason: `highest scanner score ${candidate.score} ≥ ${config.scannerMinScore}` };
    }
    log.filters.push({ t, ...filter });
    out({ type: "filter", t, bar: i, ...filter });
    if (!candidate) continue;

    // 3. Agents
    const row = candidate;
    const prevClose = ds.symbols[row.symbol][i - 1]?.c;
    const step = async (agent, ctx) => {
      out({ type: "agent_start", t, bar: i, agent: agent.name, symbol: row.symbol });
      if (agentStepMs) await sleep(agentStepMs);
      const r = runAgent(agent, ctx);
      log.agentRuns.push({ t, symbol: row.symbol, ...r });
      out({ type: "agent", t, bar: i, symbol: row.symbol, ...r });
      return r;
    };
    const tape = await step(TAPE, { row });
    const price = await step(PRICE, { row });
    const wire = await step(WIRE, { row, prevClose });
    const entry = price.output.entry;
    const equity = engine.equity();
    const sized = await step(SIZE, { equity, entry, stop: stopFor(entry, row.atr14) });
    const risk = await step(RISK, { row, symbol: row.symbol, entry, sized, tape, wire, engine });

    // 4. Final decision: JEV when connected (RISK keeps its veto), otherwise the rules gate.
    let decision, source, jevOut = null;
    const objections = [tape, wire, risk].filter((a) => ["BEARISH", "NEUTRAL", "CAUTION", "BLOCK", "VETO"].includes(a.verdict))
      .map((a) => ({ agent: a.agent, verdict: a.verdict, summary: a.summary }));
    if (jev.state === "CONNECTED") {
      const j = await jevDecide({ symbol: row.symbol, agents: [tape, price, wire, sized, risk].map(({ agent, verdict, summary, output }) => ({ agent, verdict, summary, output })) });
      jevOut = { decision: j.answers.decision.decision, confidence: j.answers.decision.confidence, probabilities: j.answers.decision.probabilities, latencyMs: j.latencyMs, model: j.model };
      source = "JEV";
      decision = jevOut.decision === "BUY" && risk.verdict === "VETO" ? "SKIP" : jevOut.decision;
    } else {
      source = "RULES";
      if (risk.verdict === "VETO") decision = risk.output.vetoes.every((v) => TEMPORARY_VETO.test(v)) ? "HOLD" : "SKIP";
      else decision = tape.verdict === "BULLISH" && wire.verdict !== "BLOCK" ? "BUY" : "SKIP";
    }
    const reasons = [
      `TAPE ${tape.verdict}: ${tape.summary}`,
      `PRICE ${price.output.orderType} @ ${entry.toPrecision(6)}`,
      `WIRE ${wire.verdict}${wire.output.flags.length ? `: ${wire.output.flags.join("; ")}` : ""}`,
      `RISK ${risk.verdict}: ${risk.summary}`,
    ];
    const final = {
      type: "decision", t, bar: i, symbol: row.symbol, decision, source,
      jev: jevOut ?? { state: "NOT_CONNECTED", missing: jev.missing },
      rulesStrength: tape.strength,
      entry, orderType: price.output.orderType, stop: risk.output.stop, takeProfit: risk.output.takeProfit,
      qty: sized.output.qty, notional: sized.output.notional, pctOfEquity: sized.output.pctOfEquity,
      reasons, objections,
    };
    log.decisions.push(final);
    out(final);

    // 5. EXEC: paper order only.
    if (decision === "BUY") {
      await step(EXEC, { engine, order: { symbol: row.symbol, type: price.output.orderType, price: entry, qty: sized.output.qty, stop: risk.output.stop, takeProfit: risk.output.takeProfit, bar: i, t } });
    }
  }

  const metrics = engine.metrics();
  const result = {
    runId, mode, label, dataMode: "REPLAY", stopped,
    dataset: { id: ds.id, title: ds.title, quote: ds.quote, source: ds.source },
    window: { from: startBar, to: endBar, startT: ds.times[startBar], endT: ds.times[endBar] },
    jev, safety: SAFETY_SUMMARY, metrics,
    trades: engine.trades, equityCurve: engine.equityCurve,
    decisions: log.decisions, agentRuns: log.agentRuns, filters: log.filters, riskActions: engine.riskActions,
  };
  await mkdir(RUNS_DIR, { recursive: true });
  const file = path.join(RUNS_DIR, `${runId}.json`);
  await writeFile(file, JSON.stringify(result));
  out({ type: "session_end", runId, stopped, metrics, file: path.relative(path.join(RUNS_DIR, ".."), file) });
  return result;
}
