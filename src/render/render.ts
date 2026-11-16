import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReportData } from "../engine/contract";

// Read from the project root: bundled server routes don't keep source-relative paths.
// next.config.mjs ships template.html with the functions that render reports.
let cached: string | null = null;
const template = () => (cached ??= readFileSync(join(process.cwd(), "src/render/template.html"), "utf8"));

/** Render a report to a complete HTML page. Scores are computed in the page from the letter grades. */
export function renderReport(r: ReportData, html = template()): string {
  // Escape "</" so report text can never close the JSON script tag.
  const json = JSON.stringify(r, null, 1).replace(/<\//g, "<\\/");
  const title = `${r.shortName} ${r.tool === "website-report-card" ? "Website Report Card" : "Enrollment Marketing Assessment"}`;
  return html.replace("__TITLE__", title.replace(/[<>&]/g, "")).replace("__REPORT_DATA__", () => json);
}
