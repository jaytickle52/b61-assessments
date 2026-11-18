// Regression (Nov 18 2026): /api/request crashed on Vercel because importing the collector
// read axe.min.js and the in-page scripts from disk at module load. Importing must not touch disk.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
process.chdir(mkdtempSync(join(tmpdir(), "b61-")));
try {
  await import(join(root, "src/tools/website/collect/index.ts"));
  const { toInput } = await import(join(root, "src/tools/website/collect/input.ts"));
  const i = toInput({ url: "www.OcaEagles.org/about", city: "Chickamauga", state: "ga", schoolName: "Oakwood" });
  const ok = i.domain === "ocaeagles.org" && i.url === "https://www.ocaeagles.org/" && i.state === "GA" && i.keyword === "christian school chickamauga";
  console.log(ok ? "lazy collector test passed" : "lazy collector test FAILED", i);
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.log("lazy collector test FAILED: import touched disk", e);
  process.exit(1);
}
