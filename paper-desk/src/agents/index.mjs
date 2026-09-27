import { tape } from "./tape.mjs";
import { price } from "./price.mjs";
import { wire } from "./wire.mjs";
import { size } from "./size.mjs";
import { exec } from "./exec.mjs";
import { risk } from "./risk.mjs";

export const AGENTS = [tape, price, wire, size, exec, risk];

/** Run one agent and measure its real latency. */
export function runAgent(agent, ctx) {
  const t0 = performance.now();
  const out = agent.run(ctx);
  return { agent: agent.name, role: agent.role, ...out, latencyMs: +(performance.now() - t0).toFixed(3), ...(agent.partial && { status: "PARTIAL", note: agent.partial }) };
}
