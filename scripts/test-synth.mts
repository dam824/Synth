import { orchestrate } from "../src/lib/ai/orchestrator";
import { judge } from "../src/lib/ai/judge";
import type { ProviderSuccess } from "../src/lib/ai/types";

const prompt =
  process.argv.slice(2).join(" ") ||
  "Comment négocier une augmentation de salaire sans braquer mon manager ?";

console.log("PROMPT :", prompt, "\n");

const results = await orchestrate(prompt);
for (const r of results) {
  console.log(
    r.ok
      ? `✔ ${r.provider} — ${r.latencyMs}ms (${r.model})`
      : `�’ ${r.provider} — ÉCHEC : ${r.error}`,
  );
}

const successes = results.filter((r): r is ProviderSuccess => r.ok);
if (successes.length === 0) {
  console.error("\nAucun fournisseur n'a répondu.");
  process.exit(1);
}

const final = await judge(prompt, successes);
console.log("\n========== RÉPONSE SYNTH ==========");
console.log("Confiance :", final.confidence);
console.log("\nTitre :", final.title);
console.log("\n" + final.finalAnswer);
if (final.keyPoints.length) {
  console.log("\nPoints clés :");
  for (const p of final.keyPoints) console.log("  - " + p);
}
if (final.disagreements.length) {
  console.log("\nNuances :");
  for (const d of final.disagreements) console.log("  - " + d);
}
