// Print what JEV needs, without printing any secret.
import { installSafetyGuard } from "../src/safety.mjs";
import { checkJev } from "../src/jev/adapter.mjs";
installSafetyGuard();
const s = await checkJev();
console.log(`JEV: ${s.state}`);
for (const m of s.missing) console.log(`  missing: ${m}`);
if (s.state === "CONNECTED") console.log(`  model: ${s.model}; available: ${s.models.join(", ")}`);
process.exit(s.state === "CONNECTED" ? 0 : 1);
