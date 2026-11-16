// The evidence check must reject grades whose quotes aren't on the site,
// reject keys that aren't AI-graded, and strip em dashes from what it keeps.
import { readFileSync } from "node:fs";
import { validate, type AiOutput } from "../src/tools/website/ai";

const d = JSON.parse(readFileSync("fixtures/ocaeagles.collected.json", "utf8"));
const r = validate(
  {
    items: [
      { key: "conv.testimonials", g: "A", found: "Great quotes.", evidence: ["Our family loves OCA, said one parent"] },
      { key: "content.path", g: "A", found: "Clear steps — four of them.", evidence: ["Step 2 Application"] },
      { key: "seo.rank", g: "A", found: "x", evidence: ["Visit Us"] },
    ],
  } as AiOutput,
  d
);
const ok =
  r.kept.length === 1 &&
  r.kept[0].key === "content.path" &&
  !r.kept[0].found.includes("—") &&
  r.dropped.some((x) => x.key === "conv.testimonials" && /evidence not found/.test(x.reason)) &&
  r.dropped.some((x) => x.key === "seo.rank");
console.log(ok ? "validator test passed" : "validator test FAILED");
console.log("dropped:", r.dropped.slice(0, 2).map((x) => `${x.key}: ${x.reason}`).join(" | "));
console.log("dash rewrite:", r.kept[0]?.found);
process.exit(ok ? 0 : 1);
