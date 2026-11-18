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

export { toInput } from "./input";
