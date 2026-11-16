import type { CollectedData, CollectInput } from "./types";
import { collectFromBrowser } from "./browser";
import { collectPageSpeed } from "./pagespeed";
import { collectSearch } from "./dataforseo";

/** Run every collector in parallel. A failed source becomes null; its items are marked "not graded". */
export async function collectWebsite(input: CollectInput) {
  const [browser, speed, search] = await Promise.allSettled([collectFromBrowser(input), collectPageSpeed(input.url), collectSearch(input)]);
  if (browser.status === "rejected") throw new Error(`Couldn't load ${input.url}: ${browser.reason}`);
  const { coverPng, ...b } = browser.value;
  const data: CollectedData = {
    ...b,
    collectedAt: new Date().toISOString(),
    pagespeed: speed.status === "fulfilled" ? speed.value.pagespeed : null,
    lighthouseA11y: speed.status === "fulfilled" ? speed.value.lighthouseA11y : null,
    serp: search.status === "fulfilled" ? search.value.serp : null,
    mapPack: search.status === "fulfilled" ? search.value.mapPack : null,
  };
  const warnings = [speed, search].filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason));
  return { data, coverPng, warnings };
}

/** Normalize the intake form's URL into collector input. The keyword defaults to "christian school <city>". */
export function toInput(f: { url: string; city: string; state: string; schoolName: string; keyword?: string }): CollectInput {
  const u = new URL(/^https?:\/\//.test(f.url) ? f.url : `https://${f.url}`);
  return {
    url: `${u.protocol}//${u.host}/`,
    domain: u.host.replace(/^www\./, "").toLowerCase(),
    keyword: (f.keyword?.trim() || `christian school ${f.city}`).toLowerCase(),
    city: f.city.trim(),
    state: f.state.trim().toUpperCase().slice(0, 2),
    schoolName: f.schoolName.trim(),
  };
}
