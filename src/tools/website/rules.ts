import type { Grade, ReportItem } from "../../engine/contract";
import type { CollectedData } from "./collect/types";
import { resultType } from "./collect/serp";

// Rules for every "measured" item. Each returns the fields of a ReportItem except key/t/i/why,
// which come from items.ts. Thresholds follow Jay's calibration notes in the
// B61-Website Report Card skill; where the skill is silent, the threshold is noted inline.
// Writing rules: no em dashes, plain words, every finding names something real.

type Partial = Omit<ReportItem, "key" | "t" | "i" | "why">;
type Rule = (d: CollectedData) => Partial;

const n = (x: number) => x.toLocaleString("en-US");
const plural = (k: number, one: string, many = one + "s") => `${k} ${k === 1 ? one : many}`;
const kw = (d: CollectedData) => d.input.keyword;
const city = (d: CollectedData) => d.input.city.toLowerCase();

/** Keyword match used for titles, H1s and descriptions: the city plus "christian" or "school". */
function keywordMatch(text: string | null | undefined, d: CollectedData): "full" | "partial" | "none" {
  const t = (text ?? "").toLowerCase();
  const hasCity = t.includes(city(d));
  const hasType = /christian|school|academy/.test(t);
  if (hasCity && hasType) return "full";
  if (hasCity || /christian school/.test(t)) return "partial";
  return "none";
}

function photoAlt(d: CollectedData) {
  const photos = d.home.images.filter((i) => !/logo|icon/i.test(i.src));
  const good = photos.filter((i) => i.alt && i.alt.trim() && !/\.(jpe?g|png|gif|webp)$/i.test(i.alt.trim()));
  const file = photos.filter((i) => i.alt && /\.(jpe?g|png|gif|webp)$/i.test(i.alt.trim()));
  const bg = photos.filter((i) => i.background);
  const decorative = d.home.images.filter((i) => i.alt === "").length;
  const share = photos.length ? good.length / photos.length : 1;
  // Skill is silent on cutoffs; calibrated so New Hope (8 of 22 descriptive) lands on D.
  const g: Grade = share >= 0.9 ? "A" : share >= 0.7 ? "B" : share >= 0.45 ? "C" : share >= 0.15 ? "D" : "F";
  return { photos, good, file, bg, decorative, g };
}

const suggestedTitle = (d: CollectedData) =>
  `Christian School in ${d.input.city}, ${d.input.state} | ${d.input.schoolName ?? d.home.title.split("|")[0].trim()}`;

export const RULES: Record<string, Rule> = {
  // ----- User Experience -----
  "ux.404": (d) =>
    d.notFound.custom
      ? { g: "A", found: "A made-up address returns a custom page that points visitors back into the site." }
      : {
          g: "D",
          found: `A made-up address on ${d.input.domain} shows the theme's default message ("${d.notFound.text.slice(0, 60).replace(/\.$/, "")}"), with no links to admissions or a phone number.`,
          rec: "Create a branded 404 page with links to Admissions, Schedule a Visit, and the phone number.",
        },

  // ----- Conversion -----
  "conv.phone": (d) => {
    const tel = d.home.telLinks.find((t) => !/555-?5555/.test(t.href));
    const fake = d.home.telLinks.find((t) => /555-?5555/.test(t.href));
    if (fake)
      return {
        g: "D",
        found: `The tap-to-call link points to a placeholder number (${fake.text || fake.href}), so a parent tapping it on a phone reaches a number that doesn't exist.`,
        rec: "Fix the placeholder link, then make sure the real number is tappable on every page.",
      };
    if (tel && (tel.inFooter || tel.inHeader))
      return {
        g: "A",
        found: `${tel.text} appears in the ${tel.inHeader ? "header" : "footer"} of every page with a working tap-to-call link.`,
      };
    if (d.home.phonesInText.length)
      return {
        g: "C",
        found: `${d.home.phonesInText[0]} appears on the homepage, but it isn't a tap-to-call link, so parents on phones have to copy it by hand.`,
        rec: "Make the number a tap-to-call link and keep it in the footer of every page.",
      };
    return { g: "F", found: "We couldn't find a phone number on the homepage.", rec: "Add your main number, as a tap-to-call link, to the footer of every page." };
  },

  // ----- SEO -----
  "seo.mappack": (d) => {
    const m = d.mapPack;
    if (!m) return { unassessed: true, found: "We couldn't retrieve Google Maps results for this search." };
    const p = m.profile;
    const table = {
      type: "table" as const,
      cols: ["Rank", "School", "Address"],
      rows: m.top.map((r) => [String(r.rank), r.title, r.address]),
      highlight: m.top.findIndex((r) => r.rank === m.schoolRank),
    };
    if (!m.schoolRank)
      return {
        g: "F",
        found: `${d.input.schoolName ?? "The school"} doesn't appear in the top results on Google Maps for "${kw(d)}."`,
        visual: table,
        rec: "Claim and complete the Google Business Profile: correct category, hours, description, and current photos.",
      };
    const gaps = [
      p && (p.photos ?? 0) < 5 ? "add current photos" : "",
      p && !p.hours ? "add hours" : "",
      p && !p.description ? "add a description" : "",
    ].filter(Boolean);
    const g: Grade = m.schoolRank === 1 ? (gaps.length > 1 ? "B" : "A") : m.schoolRank <= 3 ? "B" : "C";
    return {
      g,
      found: `For "${kw(d)}," ${d.input.schoolName ?? "the school"} is the <strong>#${m.schoolRank} result in Google Maps</strong>.${
        p ? ` The profile has ${plural(p.photos ?? 0, "photo")}, ${p.hours ? "posted hours" : "no hours"}, and the category "${p.category ?? "none"}."` : ""
      }`,
      visual: table,
      rec: gaps.length ? `Protect this position: ${gaps.join(", ")}.` : undefined,
    };
  },

  "seo.rank": (d) => {
    const s = d.serp;
    if (!s || (!s.verified && s.schoolRank === null))
      return { unassessed: true, found: `We couldn't confirm where ${d.input.domain} ranks for "${kw(d)}" in this run, so this item isn't graded.` };
    const rows = s.organic.slice(0, 9).map((r) => [r.title, r.host, r.host === d.input.domain ? "School site" : resultType(r.host, r.title)] as [string, string, string]);
    const r = s.schoolRank;
    const g: Grade = r === null ? "F" : r <= 3 ? "A" : r <= 6 ? "B" : r <= 10 ? "C" : "D";
    return {
      g,
      found:
        r === null
          ? `${d.input.domain} does not appear in the top 20 organic results for "${kw(d)}."`
          : `${d.input.domain} is the <strong>#${r} organic result</strong> for "${kw(d)}."`,
      visual: { type: "serp", rows, rank: r ?? undefined, absent: r === null ? `${d.input.domain}: not in the top 20` : undefined },
      rec: r !== null && r <= 3 ? undefined : "Start with the title, heading, and meta description fixes in this section.",
    };
  },

  "seo.title-keyword": (d) => {
    const m = keywordMatch(d.home.title, d);
    const g: Grade = m === "full" ? "A" : m === "partial" ? "C" : "F";
    return {
      g,
      found:
        m === "full"
          ? `The homepage title, "${d.home.title}," names both what you are and where.`
          : `The homepage title is "${d.home.title}" (${d.home.title.length} characters). It names the school but not ${m === "partial" ? "what kind of school it is" : "the location"}.`,
      visual: m === "full" ? undefined : { type: "compare", bad: ["Homepage title today", d.home.title], good: ["Suggested", suggestedTitle(d)], plain: true },
      rec: m === "full" ? undefined : "Use the suggested title above, so it carries the city and the kind of school families search for.",
    };
  },

  "seo.h1": (d) => {
    const h1s = d.home.headings.filter((h) => h.tag === "H1");
    if (d.home.h1Count === 0)
      return {
        g: "F",
        found: `The homepage has no H1 tag. The largest heading on the page is an H2 ("${d.home.headings[0]?.text ?? "none"}").`,
        rec: `Add one H1 that includes your keyword, for example "A Christ-centered school in ${d.input.city}, ${d.input.state}."`,
      };
    const ok = h1s.some((h) => keywordMatch(h.text, d) !== "none");
    if (ok && d.home.h1Count === 1) return { g: "A", found: `The homepage H1, "${h1s[0].text}," includes the location or school type.` };
    return {
      g: d.home.h1Count > 1 ? "F" : "C",
      found: `The homepage has ${plural(d.home.h1Count, "H1 tag")}, and ${ok ? "only some" : "none"} describe the school.`,
      visual: { type: "table", cols: ["Tag", "Text on the page"], mono: 0, rows: h1s.slice(0, 8).map((h) => [h.tag, h.text]) },
      rec: "Use one H1 per page that includes your keyword. Turn other large text into styled text instead of headings.",
    };
  },

  "seo.analytics": (d) => {
    const a = d.home.analytics;
    if (a.ga4Ids.length || a.gtmIds.length || d.home.analyticsScript)
      return { g: "A", found: `${a.gtmIds.length ? "Google Tag Manager" : "A Google Analytics tag"} is installed on the homepage.` };
    if (a.uaIds.length)
      return { g: "D", found: "Only the retired Universal Analytics code was found. It stopped collecting data in 2023.", rec: "Install Google Analytics 4 and set up a conversion for inquiry and tour bookings." };
    return { g: "F", found: "No Google Analytics or Google Tag Manager code was detected.", rec: "Install Google Analytics 4 and set up a conversion for inquiry and tour bookings." };
  },

  "seo.meta": (d) => {
    const desc = d.home.metaDescription;
    const titleOk = !!d.home.title;
    const g: Grade = titleOk && desc ? (keywordMatch(d.home.title, d) === "full" ? "A" : "B") : titleOk ? "F" : "F";
    return {
      g,
      visual: {
        type: "table",
        cols: ["Tag", "Value"],
        rows: [
          ["Title", titleOk ? d.home.title : '<span class="bad-text">Missing</span>'],
          ["Description", desc ? desc : '<span class="bad-text">Missing</span>'],
        ],
      },
      rec: desc ? undefined : `Write a 140 to 160 character description that names the school, the grades, and ${d.input.city}. Google often shows it under your link.`,
    };
  },

  "seo.alt": (d) => {
    const a = photoAlt(d);
    const bgNote = a.bg.length
      ? ` ${plural(a.bg.length, "photo is", "photos are")} placed as background images, which can't carry alt text at all.`
      : "";
    return {
      g: a.g,
      found: `${a.good.length} of ${a.photos.length} homepage photos have descriptive alt text.${a.file.length ? ` ${a.file.length} use the file name instead.` : ""}${bgNote} See the Accessibility section for a breakdown.`,
    };
  },

  "seo.content": (d) => {
    const w = d.home.wordCount;
    // Skill is silent on cutoffs; calibrated so New Hope (about 400 words) lands on D.
    const g: Grade = w >= 1000 ? "A" : w >= 700 ? "B" : w >= 450 ? "C" : w >= 250 ? "D" : "F";
    return {
      g,
      found: `The homepage has about ${n(Math.round(w / 10) * 10)} words in total, including menus and footer.`,
      rec: g <= "B" ? undefined : "Add a short section for each grade level that answers what a parent wants to know: what a day looks like, class size, and what makes the program distinct.",
    };
  },

  "seo.blog": (d) => {
    const b = d.blog;
    if (!b.url || (!b.latestPostDate && !b.recentTitles.length))
      return {
        g: "F",
        found: b.url ? `We found an events page (${b.url.replace(/^https?:\/\/[^/]+/, "")}) but no news or blog posts.` : "We didn't find a news, blog, or resource section.",
        rec: "Publish one short post a month that answers a question parents search for, such as tuition, scholarships, or how to choose a school.",
      };
    const days = b.latestPostDate ? (Date.parse(d.collectedAt) - Date.parse(b.latestPostDate)) / 864e5 : 999;
    const parentTopics = b.recentTitles.some((t) => /tuition|scholar|esa|afford|choos|kindergarten ready|why christian/i.test(t));
    const g: Grade = days <= 90 ? (parentTopics ? "A" : "B") : days <= 365 ? "C" : "D";
    return {
      g,
      found: `The news section's most recent post is from ${b.latestPostDate ?? "an unknown date"}.${parentTopics ? "" : " Posts focus on school news rather than the questions parents search for."}`,
    };
  },

  "seo.schema": (d) => {
    const t = d.home.schemaTypes;
    const school = t.some((x) => /School|EducationalOrganization/i.test(x));
    const org = t.some((x) => /Organization|LocalBusiness/i.test(x));
    const g: Grade = school ? "A" : org ? "B" : t.length ? "C" : "F";
    return {
      g,
      visual: {
        type: "table",
        cols: ["Schema type", "Status"],
        rows: [
          ["School / EducationalOrganization", school ? '<span class="ok-text">Available</span>' : '<span class="bad-text">Missing</span>'],
          ["Organization / LocalBusiness", org ? '<span class="ok-text">Available</span>' : '<span class="bad-text">Missing</span>'],
          ["WebSite", t.includes("WebSite") ? '<span class="ok-text">Available</span>' : '<span class="bad-text">Missing</span>'],
        ],
      },
      rec: school ? undefined : "Add School schema with your name, address, phone, grades, and logo. Most SEO plugins can do this in a few minutes.",
    };
  },

  "seo.address": (d) => {
    const a = d.home.addressInFooter;
    if (!a) return { g: "F", found: "We couldn't find a street address in the footer.", rec: "Put your full address and phone number in the footer of every page." };
    return {
      g: d.home.mapEmbed ? "A" : "B",
      found: `The address (${a}) appears in the footer on every page.${d.home.mapEmbed ? " A map is embedded." : " There's no map embedded on the site."}`,
      rec: d.home.mapEmbed ? undefined : "Embed a Google map on the Contact page.",
    };
  },

  // Technical checklist (compact rows)
  "seo.crawlable": (d) => ({
    g: d.robots.blocksGoogle ? "F" : "A",
    found: d.robots.blocksGoogle ? "robots.txt blocks Google" : `robots.txt allows Google${d.sitemap.urlCount ? `; ${d.sitemap.urlCount} pages listed in the sitemap` : ""}`,
  }),
  "seo.www": (d) => ({
    g: d.wwwRedirect.ok ? "A" : "D",
    found: d.wwwRedirect.ok ? `${d.wwwRedirect.from.replace(/\/$/, "")} redirects to ${d.wwwRedirect.to.replace(/\/$/, "")}` : "www and non-www versions don't redirect to one address",
  }),
  "seo.name-in-title": (d) => {
    const name = (d.input.schoolName ?? "").toLowerCase();
    const ok = !name || d.home.title.toLowerCase().includes(name);
    return { g: ok ? "A" : "C", found: ok ? "Present in the homepage title" : "The homepage title doesn't include the school's name" };
  },
  "seo.title-length": (d) => {
    const L = d.home.title.length;
    const g: Grade = !L ? "F" : L <= 60 ? "A" : L <= 70 ? "B" : L <= 80 ? "C" : "D";
    return { g, found: `${L} characters${L > 60 ? ", so Google cuts it off around 60" : ", under the 60 Google shows"}` };
  },
  "seo.sitemap": (d) => ({
    g: d.sitemap.status === 200 && d.sitemap.urlCount ? "A" : "F",
    found: d.sitemap.status === 200 ? `Present, ${d.sitemap.urlCount} URLs` : "No sitemap found",
  }),
  "seo.indexed": (d) => {
    const found = d.serp?.schoolRank != null || d.mapPack?.schoolRank != null;
    return { g: found ? "A" : "C", found: found ? "Indexed; the site appears in Google results for its keyword" : "Not seen in results for the keyword checked" };
  },
  "seo.desc-length": (d) => {
    const L = d.home.metaDescription?.length ?? 0;
    const g: Grade = !L ? "F" : L >= 120 && L <= 160 ? "A" : L >= 70 && L <= 175 ? "B" : "C";
    return { g, found: L ? `${L} characters` : "No description to measure" };
  },
  "seo.desc-keyword": (d) => {
    const m = keywordMatch(d.home.metaDescription, d);
    return { g: !d.home.metaDescription ? "F" : m === "full" ? "A" : m === "partial" ? "C" : "D", found: !d.home.metaDescription ? "No description" : m === "full" ? "Includes the school type and city" : "Missing the city or school type" };
  },
  "seo.og": (d) => {
    const og = d.home.og;
    const have = ["og:title", "og:description", "og:image"].filter((k) => og[k]);
    return { g: have.length === 3 ? "A" : have.length ? "C" : "F", found: have.length === 3 ? "Title, description, and image set" : have.length ? `Only ${have.join(", ")} set` : "No Open Graph tags, so shared links show no preview image or description" };
  },
  "seo.alt-keyword": (d) => {
    const withKw = d.home.images.filter((i) => i.alt && keywordMatch(i.alt, d) !== "none").length;
    return { g: withKw >= 2 ? "A" : withKw ? "C" : "F", found: withKw ? `${plural(withKw, "image")} with keyword alt text` : "No homepage images use the keyword in alt text" };
  },
  "seo.pixel": (d) => ({ g: d.home.pixel ? "A" : "F", found: d.home.pixel ? "Installed" : "Not installed" }),

  // ----- Performance & Security -----
  "perf.https": (d) => ({
    g: d.https ? "A" : "F",
    found: d.https ? `The site runs on https://${d.input.domain} with a valid SSL certificate.` : "The site does not load over HTTPS, so browsers mark it \"Not secure.\"",
  }),

  "perf.speed": (d) => {
    const p = d.pagespeed;
    if (!p) return { unassessed: true, found: "Google PageSpeed didn't return results during this run." };
    const m = p.mobile.score, k = p.desktop.score;
    // Jay: mobile around 60 with desktop around 90 is a B.
    const g: Grade = m >= 85 && k >= 90 ? "A" : m >= 55 && k >= 80 ? "B" : m >= 40 && k >= 65 ? "C" : m >= 25 ? "D" : "F";
    const lcpBad = p.mobile.lcp > 4;
    return {
      g,
      found: `Mobile performance is ${m}/100 and desktop is ${k}/100.${lcpBad ? ` On a typical phone connection, the main content takes <strong>${p.mobile.lcp.toFixed(1)} seconds</strong> to appear. Most parents will see your site on a phone first.` : ""}`,
      visual: {
        type: "speed",
        scores: { mobile: m, desktop: k },
        metrics: [
          { name: "First Contentful Paint", unit: "s", mobile: p.mobile.fcp, desktop: p.desktop.fcp, good: 1.8, poor: 3.0 },
          { name: "Largest Contentful Paint", unit: "s", mobile: p.mobile.lcp, desktop: p.desktop.lcp, good: 2.5, poor: 4.0 },
          { name: "Speed Index", unit: "s", mobile: p.mobile.si, desktop: p.desktop.si, good: 3.4, poor: 5.8 },
          { name: "Total Blocking Time", unit: "ms", mobile: p.mobile.tbt, desktop: p.desktop.tbt, good: 200, poor: 600 },
          { name: "Cumulative Layout Shift", unit: "", mobile: p.mobile.cls, desktop: p.desktop.cls, good: 0.1, poor: 0.25 },
        ],
        note: p.mobile.opportunities.length
          ? `Top mobile opportunities: ${p.mobile.opportunities.slice(0, 3).map((o) => `${o.title.toLowerCase()} (${o.savings})`).join(", ")}.`
          : "",
      },
      rec: lcpBad ? "Compress and resize the large homepage photos, starting with the hero. That one change addresses most of the mobile delay." : undefined,
    };
  },

  "perf.images": (d) => {
    const p = d.pagespeed;
    if (!p || p.imageSavingsKiB == null) return { unassessed: true, found: "Image data wasn't available from PageSpeed in this run." };
    const s = p.imageSavingsKiB;
    // Skill is silent; calibrated so New Hope (~1 MB savings, 4 MB page) lands on D.
    const g: Grade = s < 150 ? "A" : s < 500 ? "B" : s < 900 ? "C" : s < 3000 ? "D" : "F";
    return {
      g,
      found: `PageSpeed estimates about ${s >= 1000 ? (s / 1024).toFixed(1) + " MB" : n(s) + " KB"} of savings from better-compressed images.${p.totalKiB ? ` The homepage loads ${(p.totalKiB / 1024).toFixed(1)} MB in total before any interaction.` : ""}${p.unsizedImages ? " Images lack explicit width and height." : ""}`,
      rec: g <= "B" ? undefined : "Resize photos to the size they display at (usually under 2000 pixels wide) and save them as WebP.",
    };
  },

  "perf.caching": (d) => {
    const p = d.pagespeed;
    const comp = p?.textCompression ?? !!d.headers.contentEncoding;
    const cache = p?.cacheSavingsKiB ?? 0;
    const g: Grade = comp && cache < 50 ? "A" : comp ? "B" : "D";
    return {
      g,
      found: `${comp ? `Pages are compressed${d.headers.contentEncoding ? ` (${d.headers.contentEncoding === "br" ? "Brotli" : d.headers.contentEncoding})` : ""}` : "Pages are not compressed"}${cache < 50 ? " and PageSpeed found no caching problems." : `, and PageSpeed flagged about ${n(cache)} KB of caching improvements.`}`,
    };
  },

  "perf.cdn": (d) => {
    const cdn = d.headers.cdn;
    return cdn
      ? { g: "A", found: `Images and files are served through ${cdn}.` }
      : {
          // Skill is silent; a missing CDN is common on small school sites, so D rather than F.
          g: "D",
          found: `Every image and file is served from the school's own server (${d.headers.server ?? "web server"}). No content delivery network was detected.`,
          rec: "Put the site behind a CDN such as Cloudflare (free plan) or your host's built-in CDN.",
        };
  },

  // ----- Accessibility -----
  "a11y.automated": (d) => {
    const a = d.axe, L = d.lighthouseA11y;
    if (!a || L == null) return { unassessed: true, found: "The accessibility scan didn't complete during this run." };
    const critical = a.violations.some((v) => v.impact === "critical");
    let g: Grade = L >= 95 ? "A" : L >= 90 ? "B" : L >= 80 ? "C" : L >= 65 ? "D" : "F";
    if (critical && (g === "A" || g === "B")) g = "C";
    const elements = a.violations.reduce((s, v) => s + v.nodes, 0);
    const lvl = (t: string[]) => (t.includes("wcag2a") || t.includes("wcag21a") ? "A" : t.some((x) => /aa$/.test(x)) ? "AA" : "Best practice");
    const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
    return {
      g,
      found: `Google Lighthouse scores the homepage <strong>${L} out of 100</strong> for accessibility. axe-core found ${plural(a.violations.length, "rule violation")} affecting ${plural(elements, "element")}, and ${a.passes} rules passed.`,
      visual: {
        type: "axe",
        lighthouse: L,
        issues: a.violations
          .sort((x, y) => ["critical", "serious", "moderate", "minor"].indexOf(x.impact) - ["critical", "serious", "moderate", "minor"].indexOf(y.impact))
          .map((v) => [v.help, cap(v.impact), lvl(v.tags), v.nodes] as [string, string, string, number]),
        note: a.incompleteContrast ? `axe-core also flagged ${a.incompleteContrast} text elements over images or backgrounds whose contrast needs a manual check.` : "",
      },
      rec: critical && a.violations.some((v) => v.id === "meta-viewport")
        ? "Start with the critical item: remove \"maximum-scale=1.0, user-scalable=0\" from the viewport tag so parents can zoom in on phones. It's a one-line change."
        : undefined,
    };
  },

  "a11y.alt": (d) => {
    const a = photoAlt(d);
    const empty = Math.max(0, a.photos.length - a.good.length - a.file.length);
    return {
      g: a.g,
      found: a.bg.length
        ? `${a.good.length} of ${a.photos.length} homepage photos have descriptive alt text. ${plural(a.bg.length, "photo is", "photos are")} placed as CSS background images, so a screen reader skips ${a.bg.length === 1 ? "it" : "them"} entirely. The ${plural(a.decorative, "logo")} marked decorative ${a.decorative === 1 ? "is" : "are"} handled correctly.`
        : `${a.good.length} of ${a.photos.length} homepage photos have descriptive alt text.${a.file.length ? ` ${a.file.length} use the file name, which a screen reader reads aloud.` : ""}`,
      visual: { type: "dots", good: a.good.length, file: a.file.length, empty },
      rec: a.g <= "B" ? undefined : a.bg.length
        ? "For photos that carry meaning (students, classrooms), place them as real images with a short description instead of as section backgrounds."
        : "Open each image in your site editor and write a short description, starting with the homepage.",
    };
  },

  "a11y.contrast": (d) => {
    const v = d.axe?.violations.find((x) => x.id === "color-contrast");
    if (!d.axe) return { unassessed: true, found: "The accessibility scan didn't complete during this run." };
    // Jay: site-wide failures on buttons and footer text are a C, not a D or F.
    const k = v?.nodes ?? 0;
    const g: Grade = k === 0 ? "A" : k <= 5 ? "B" : "C";
    return {
      g,
      found: k
        ? `${plural(k, "text element")} on the homepage ${k === 1 ? "fails" : "fail"} the WCAG AA contrast minimum.${d.axe.incompleteContrast ? ` Another ${d.axe.incompleteContrast} sit over photos or colored backgrounds and need a manual check.` : ""}`
        : "No contrast failures were found on the homepage.",
      rec: k ? "Darken the text or button colors that fail, add a dark overlay behind text on photos, and verify with WebAIM's free contrast checker." : undefined,
    };
  },

  "a11y.landmarks": (d) => {
    const L = d.home.landmarks;
    const ids = new Set(d.axe?.violations.map((v) => v.id) ?? []);
    const missing = [
      !L.lang && "a declared language",
      !L.header && "a header region",
      !L.main && "a main region",
      !L.footer && "a footer region",
      (!L.skipLink || ids.has("skip-link")) && "a working skip-to-content link",
    ].filter(Boolean) as string[];
    const g: Grade = missing.length === 0 ? "A" : missing.length === 1 ? "B" : missing.length === 2 ? "C" : "D";
    const parts = [L.lang && "a declared language", L.header && "a header", L.footer && "a footer"].filter(Boolean) as string[];
    const has = parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}` : parts[0] ?? "no landmark regions";
    return {
      g,
      found: missing.length
        ? `The page has ${has}, but it's missing ${missing.join(" and ")}.${L.skipLink && ids.has("skip-link") ? " The skip link exists, but its target isn't on the page." : ""}`
        : "The page includes a skip-to-content link, a declared language, and proper header, navigation, main, and footer regions.",
      rec: missing.length ? "Most themes fix this with a setting or a small template change: wrap the page content in a <main> element and point the skip link at it." : undefined,
    };
  },
};
