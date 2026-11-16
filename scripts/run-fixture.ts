// Rebuild a report from saved collector output, without touching the network.
// Usage: tsx scripts/run-fixture.ts fixtures/<school>.collected.json [--live-ai]
//   Without --live-ai it uses fixtures/<school>.ai-output.json (a saved model response).
//   With --live-ai it calls the Anthropic API (needs ANTHROPIC_API_KEY) and saves the response.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import type { CollectedData } from "../src/tools/website/collect/types";
import { gradeWithAi, validate, type AiOutput } from "../src/tools/website/ai";
import { buildWebsiteReport } from "../src/tools/website/build";
import { renderReport } from "../src/render/render";
import { summarize } from "../src/engine/scoring";

const path = process.argv[2];
const live = process.argv.includes("--live-ai");
const d: CollectedData = JSON.parse(readFileSync(path, "utf8"));
const aiPath = path.replace(".collected.json", ".ai-output.json");

let ai: ReturnType<typeof validate>;
if (live) {
  ai = await gradeWithAi(d);
} else {
  if (!existsSync(aiPath)) throw new Error(`No saved AI output at ${aiPath}; run with --live-ai`);
  ai = validate(JSON.parse(readFileSync(aiPath, "utf8")) as AiOutput, d);
}

const report = buildWebsiteReport(d, {
  preparedFor: { name: "Test Contact", org: d.input.schoolName ?? "", email: "", phone: "" },
  ai,
  coverShot: "img/cover.jpg",
});

const html = renderReport(report);
mkdirSync("out", { recursive: true });
const slug = d.input.domain.replace(/\W+/g, "-");
writeFileSync(`out/${slug}.report.json`, JSON.stringify(report, null, 2));
writeFileSync(`out/${slug}.html`, html);

const s = summarize(report);
console.log(`\n${report.school}: overall ${s.overall}%`);
for (const c of s.categories) console.log(`  ${c.name.padEnd(26)} ${c.score === null ? "Locked" : c.score + "%"}  (graded ${c.graded}, locked ${c.locked}, not graded ${c.unassessed})`);
if (ai.dropped.length) console.log("\nAI grades dropped by the evidence check:", ai.dropped);
const dashes = html.match(/—/g)?.length ?? 0;
console.log(`\nem dashes in output: ${dashes}`);
console.log(`wrote out/${slug}.html`);
