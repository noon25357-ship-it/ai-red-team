// Safety guard: this desk never talks to an exchange's trading endpoints and never holds exchange keys.
// The process-wide fetch only reaches JEV and read-only public market data; everything else throws.
const ALLOWED = [
  { host: "api.typesafe.ai", methods: ["GET", "POST"], why: "JEV decisions" },
  { host: "data-api.binance.vision", methods: ["GET"], paths: [/^\/api\/v3\/(klines|ticker\/24hr|ping|time)$/], why: "public market data (read-only)" },
];
const FORBIDDEN_ENV = /^(BINANCE|BYBIT|OKX|KRAKEN|COINBASE|KUCOIN|BITGET|GATE|MEXC|HTX|HUOBI|BITFINEX|DERIBIT|CCXT).*(KEY|SECRET|PASS)/i;

export class SafetyError extends Error {}

export function checkUrl(url, method = "GET") {
  const u = new URL(url);
  const rule = ALLOWED.find((r) => r.host === u.hostname);
  if (!rule) throw new SafetyError(`Blocked: ${u.hostname} is not an allowed host (paper desk only reaches JEV and read-only market data)`);
  if (!rule.methods.includes(method.toUpperCase())) throw new SafetyError(`Blocked: ${method} to ${u.hostname} (read-only)`);
  if (rule.paths && !rule.paths.some((p) => p.test(u.pathname))) throw new SafetyError(`Blocked: ${u.pathname} on ${u.hostname} is not a market-data endpoint`);
  return rule;
}

let installed = false;
/** Wrap global fetch so every request is checked, and refuse to start with exchange credentials in the environment. */
export function installSafetyGuard() {
  if (installed) return;
  const found = Object.keys(process.env).filter((k) => FORBIDDEN_ENV.test(k));
  if (found.length) throw new SafetyError(`Refusing to start: exchange credential variables are set (${found.join(", ")}). This desk is paper only.`);
  const real = globalThis.fetch;
  globalThis.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const method = init.method ?? (typeof input === "object" ? input.method : undefined) ?? "GET";
    try { checkUrl(url, method); } catch (err) { return Promise.reject(err); }   // fail like fetch does, before any I/O
    return real(input, init);
  };
  installed = true;
}

export const SAFETY_SUMMARY = {
  mode: "PAPER ONLY",
  realTrading: false,
  exchangeExecution: false,
  exchangeKeys: false,
  allowedHosts: ALLOWED.map(({ host, methods, why }) => ({ host, methods, why })),
};
