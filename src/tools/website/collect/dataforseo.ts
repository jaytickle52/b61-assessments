import type { CollectInput } from "./types";
import { normalizeMaps, normalizeOrganic } from "./serp";

// DataForSEO live SERP calls. Needs DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.
// Retries once when the organic result comes back degraded, then matches on real URLs.

const STATE_NAMES: Record<string, string> = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };

async function call(path: string, body: unknown) {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
  const res = await fetch(`https://api.dataforseo.com${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  const json: any = await res.json();
  const task = json.tasks?.[0];
  if (!res.ok || task?.status_code !== 20000) throw new Error(`DataForSEO ${path}: ${task?.status_message ?? res.status}`);
  return task.result?.[0]?.items ?? [];
}

export async function collectSearch(input: CollectInput) {
  // DataForSEO location names are "City,State Name,United States".
  const location = `${input.city},${STATE_NAMES[input.state.toUpperCase()] ?? input.state},United States`;
  const base = { keyword: input.keyword, location_name: location, language_code: "en" };

  let organicItems: any[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      organicItems = await call("/v3/serp/google/organic/live/regular", [{ ...base, device: "desktop", depth: 20 }]);
      const s = normalizeOrganic(organicItems, input, location);
      if (!s?.degraded || s.schoolRank !== null) break; // clean result, or school found via breadcrumb
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  const mapItems = await call("/v3/serp/google/maps/live/advanced", [{ ...base, depth: 10 }]).catch(() => []);
  return {
    serp: normalizeOrganic(organicItems, input, `${input.city}, ${STATE_NAMES[input.state.toUpperCase()] ?? input.state}`),
    mapPack: normalizeMaps(mapItems, input, input.schoolName),
  };
}
