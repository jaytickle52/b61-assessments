import type { CollectedData, CollectInput } from "./types";

// DataForSEO sometimes returns a degraded organic result: every item's `domain` is google.com
// and every `url` is a google.com/goto redirect. The real site is still in `breadcrumb`.
// Oakwood (Nov 2026) was exactly this case: matching on `domain` said "not in top 20"; the
// breadcrumb showed ocaeagles.org at #1. So we always match on the best real host we can find,
// and only call the rank "unverified" when no real hosts are recoverable at all.

interface DfsOrganicItem {
  type: string;
  rank_group: number;
  domain?: string;
  title?: string;
  url?: string;
  breadcrumb?: string;
}
interface DfsMapsItem {
  rank_group: number;
  title?: string;
  domain?: string | null;
  url?: string | null;
  address?: string;
  total_photos?: number;
  category?: string;
  work_hours?: { timetable?: unknown } | null;
  description?: string | null;
}

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, "");

/** Pull a real host from a DataForSEO organic item, preferring url, then domain, then breadcrumb. */
export function realHost(item: DfsOrganicItem): string | null {
  const tryUrl = (u?: string) => {
    if (!u) return null;
    try {
      const h = bareHost(new URL(u).host);
      return /(^|\.)google\.com$/.test(h) ? null : h;
    } catch {
      return null;
    }
  };
  const fromUrl = tryUrl(item.url);
  if (fromUrl) return fromUrl;
  if (item.domain && !/(^|\.)google\.com$/.test(item.domain)) return bareHost(item.domain);
  // Breadcrumbs look like "https://www.niche.com › ... › Georgia" or "1.9K+ followers" (social).
  const crumb = item.breadcrumb?.split("›")[0].trim();
  return tryUrl(crumb);
}

export function normalizeOrganic(items: DfsOrganicItem[], input: CollectInput, location: string): CollectedData["serp"] {
  const organic = items.filter((i) => i.type === "organic");
  const degraded = organic.length > 0 && organic.every((i) => /(^|\.)google\.com$/.test(i.domain ?? ""));
  const target = bareHost(input.domain);
  const rows = organic.map((i) => {
    const host = realHost(i);
    return { rank: i.rank_group, title: i.title ?? "", url: host ? `https://${host}` : "", host: host ?? "unknown" };
  });
  const recovered = rows.filter((r) => r.host !== "unknown").length;
  const hit = rows.find((r) => r.host === target || r.host.endsWith("." + target));
  return {
    keyword: input.keyword,
    location,
    organic: rows.slice(0, 20),
    schoolRank: hit ? hit.rank : null,
    degraded,
    // Verified when we found the school, or when enough real hosts came back to trust "not found".
    verified: !!hit || recovered >= Math.min(10, rows.length) * 0.7,
  };
}

export function normalizeMaps(items: DfsMapsItem[], input: CollectInput, schoolName?: string): CollectedData["mapPack"] {
  const target = bareHost(input.domain);
  const name = (schoolName ?? "").toLowerCase();
  const top = items.slice(0, 3).map((i) => ({
    rank: i.rank_group,
    title: i.title ?? "",
    address: i.address ?? "",
    domain: i.domain ? bareHost(i.domain) : null,
  }));
  const mine = items.find((i) => (i.domain && bareHost(i.domain) === target) || (name && (i.title ?? "").toLowerCase() === name));
  return {
    top,
    schoolRank: mine ? mine.rank_group : null,
    profile: mine
      ? {
          photos: mine.total_photos ?? null,
          hours: !!mine.work_hours?.timetable,
          category: mine.category ?? null,
          description: !!mine.description,
        }
      : null,
  };
}

/** Classify a result for the SERP table. */
export function resultType(host: string, title: string): string {
  if (/facebook|instagram|reddit|youtube|linkedin|x\.com|twitter|tiktok/.test(host) || /followers/i.test(title)) return "Social";
  if (/yelp|greatschools|niche|privateschoolreview|google\.com\/maps/.test(host)) return "Reviews";
  if (/\.edu$/.test(host)) return "College";
  if (/usnews|maxpreps|mapquest|schooldigger|aacs|acsi|legistorm|homes\.com|zillow|yellowpages|guide|directory/.test(host)) return "Directory";
  return "School site";
}
