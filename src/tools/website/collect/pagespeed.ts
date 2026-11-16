import type { CollectedData, SpeedRun } from "./types";

// Google PageSpeed Insights API. Needs PAGESPEED_API_KEY (free; 25,000 calls a day).
// The anonymous API is usually over quota, which is why the manual skill used the web UI.
// One call per form factor returns both the performance and accessibility categories.

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function run(url: string, strategy: "mobile" | "desktop", key: string) {
  const q = new URLSearchParams({ url, strategy, key });
  q.append("category", "performance");
  q.append("category", "accessibility");
  const res = await fetch(`${ENDPOINT}?${q}`, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`PageSpeed ${strategy} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).lighthouseResult as any;
}

const sec = (a: any) => +(a?.numericValue / 1000).toFixed(1);
const kib = (bytes?: number) => (bytes == null ? null : Math.round(bytes / 1024));

function speed(lr: any): SpeedRun {
  const A = lr.audits;
  const opps = Object.values(A as Record<string, any>)
    .filter((a) => a.details?.type === "opportunity" && (a.details.overallSavingsMs > 100 || a.details.overallSavingsBytes > 50_000))
    .sort((x, y) => (y.details.overallSavingsMs ?? 0) - (x.details.overallSavingsMs ?? 0))
    .slice(0, 3)
    .map((a) => ({
      title: a.title,
      savings: a.details.overallSavingsBytes > 50_000 ? `${Math.round(a.details.overallSavingsBytes / 1024).toLocaleString()} KiB` : `${Math.round(a.details.overallSavingsMs).toLocaleString()} ms`,
    }));
  return {
    score: Math.round(lr.categories.performance.score * 100),
    fcp: sec(A["first-contentful-paint"]),
    lcp: sec(A["largest-contentful-paint"]),
    si: sec(A["speed-index"]),
    tbt: Math.round(A["total-blocking-time"].numericValue),
    cls: +A["cumulative-layout-shift"].numericValue.toFixed(3),
    opportunities: opps,
  };
}

export async function collectPageSpeed(url: string, key = process.env.PAGESPEED_API_KEY!) {
  const [m, d] = await Promise.all([run(url, "mobile", key), run(url, "desktop", key)]);
  const A = m.audits;
  // Lighthouse renamed several audits in 2025 ("Improve image delivery", "Use efficient cache lifetimes"); accept both names.
  const img = A["image-delivery-insight"] ?? A["uses-optimized-images"] ?? A["modern-image-formats"];
  const cache = A["cache-insight"] ?? A["uses-long-cache-ttl"];
  const pagespeed: CollectedData["pagespeed"] = {
    mobile: speed(m),
    desktop: speed(d),
    imageSavingsKiB: kib(img?.details?.overallSavingsBytes ?? 0),
    cacheSavingsKiB: cache?.score === 1 ? 0 : kib(cache?.details?.overallSavingsBytes ?? 0),
    unsizedImages: A["unsized-images"] ? A["unsized-images"].score !== 1 : null,
    totalKiB: kib(A["total-byte-weight"]?.numericValue),
    textCompression: A["uses-text-compression"] ? A["uses-text-compression"].score === 1 : null,
  };
  return { pagespeed, lighthouseA11y: Math.round(m.categories.accessibility.score * 100) };
}
