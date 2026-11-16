import { PREPARED_BY, type ReportData, type ReportItem } from "../../engine/contract";
import type { CollectedData } from "./collect/types";
import { CATEGORIES, ITEMS, LOCKED_NOTE } from "./items";
import { RULES } from "./rules";
import { aiItems, type AiOutput } from "./ai";

export interface BuildOptions {
  preparedFor: { name: string; org: string; email: string; phone: string };
  shortName?: string;
  ai: { kept: AiOutput["items"]; dropped: { key: string; reason: string }[] };
  coverShot?: string;
  ctaHref?: string; // booking link for the consultation
}

const firstName = (s: string) => s.trim().split(/\s+/)[0] || "there";

/** Assemble the free Website Report Card. Locked items are listed but never graded. */
export function buildWebsiteReport(d: CollectedData, o: BuildOptions): ReportData {
  const ai = aiItems(o.ai.kept, o.ai.dropped);
  const school = d.input.schoolName ?? o.preparedFor.org;
  const shortName = o.shortName ?? school.replace(/\s+(Christian\s+)?(Academy|School|Schools)$/i, "").trim();

  const item = (def: (typeof ITEMS)[number]): ReportItem => {
    const base = { key: def.key, t: def.t, i: def.i, why: def.why || undefined, compact: def.compact };
    if (def.tier === "locked") return { ...base, locked: true, found: LOCKED_NOTE };
    if (def.tier === "ai") return { ...base, ...ai[def.key] };
    const r = RULES[def.key];
    if (!r) throw new Error(`No rule for ${def.key}`);
    return { ...base, ...r(d), source: "measured" };
  };

  const categories = CATEGORIES.map((c) => ({ ...c, items: ITEMS.filter((i) => i.cat === c.id).map(item) }));
  const all = categories.flatMap((c) => c.items);
  const g = (k: string) => all.find((i) => i.key === k)?.g;

  // Wins: real, specific strengths, measured first. Three are needed for the letter.
  const wins: { big: string; text: string }[] = [];
  if (d.serp?.schoolRank && d.serp.schoolRank <= 3) wins.push({ big: `#${d.serp.schoolRank}`, text: `in Google search results for "${d.input.keyword}"` });
  if (d.mapPack?.schoolRank && d.mapPack.schoolRank <= 3) wins.push({ big: `#${d.mapPack.schoolRank}`, text: `on Google Maps for "${d.input.keyword}"` });
  const pathItem = all.find((i) => i.key === "content.path");
  const steps = pathItem?.visual?.type === "path" ? pathItem.visual.steps.length : 0;
  if (g("content.path") === "A" && steps) wins.push({ big: String(steps), text: "clear, numbered admissions steps, written out on the Admissions page" });
  if (d.forms.some((f) => /schedul|book|tour/i.test(f.provider + f.notes.join(" ")))) wins.push({ big: "24/7", text: "online tour booking, so families can schedule a visit any time" });
  if (g("conv.phone") === "A") wins.push({ big: "1 tap", text: "to call the school from any page on a phone" });
  if (g("perf.https") === "A" && wins.length < 3) wins.push({ big: "HTTPS", text: "secure connection on every page" });
  if ((d.lighthouseA11y ?? 0) >= 90) wins.push({ big: String(d.lighthouseA11y), text: "out of 100 for accessibility on Google Lighthouse" });
  const topWins = wins.slice(0, 3);

  const domain = d.input.domain;
  const lockedCount = all.filter((i) => i.locked).length;
  return {
    tool: "website-report-card",
    tier: "free",
    school,
    shortName,
    url: d.home.finalUrl,
    displayUrl: domain,
    date: new Date(d.collectedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }),
    preparedFor: o.preparedFor,
    preparedBy: PREPARED_BY,
    coverShot: o.coverShot,
    letter: {
      greeting: `Hi ${firstName(o.preparedFor.name)},`,
      paragraphs: [
        `Thank you for requesting a Website Report Card for ${school}. This report checks ${domain} against the same standards my team uses in our full website audits for Christian schools.`,
        `You'll find some low marks on this report. You'll also see high marks. If you're like me, you'll be tempted to fixate on the "broken" things and miss the chance to celebrate what you are doing well. For some, this can be discouraging and overwhelming.`,
        `So let me encourage you as you read through this: take a moment to celebrate the wins. A few of them are below.`,
        `With that in mind, we want to help you make the absolute most of your school's web presence. So, when you see a low mark, imagine the word "Opportunity." That's really what we're talking about: opportunities to reach and engage more families who need what ${shortName} offers.`,
        `A few things to know about this free version. Most grades are measured directly from your site and Google's tools. Grades marked "AI-assisted" were scored by AI against our rubric, using only what's on your site. ${lockedCount} items, mostly about design and storytelling, require human judgment, so they're locked here and reviewed by my team in the full Website Report Card.`,
        `You can take the insights offered here and try to implement them in-house, pass this on to your webmaster, or invite our team at Banner 61 to make these changes for you. Regardless of your next step, I hope you find this report tremendously valuable.`,
      ],
      wins: topWins,
    },
    categories,
    closing: {
      greeting: `${firstName(o.preparedFor.name)},`,
      paragraphs: [
        `We appreciate you taking the time to review this Website Report Card for ${school}.`,
        `The actionable information in this audit can help more families discover your school, engage with your content, connect with your team, and ultimately enroll in your program. Making these changes can also lead to more satisfied parents who remain and refer others.`,
        `The full Website Report Card adds my team's review of the ${lockedCount} locked items, including design, photography, and how well your site tells your school's story, plus a walkthrough call.`,
        `If you want to improve your website and increase the number of prospective families in your pipeline, let's talk!`,
      ],
      journey: ["Discover", "Engage", "Connect", "Enroll", "Remain", "Refer"],
    },
    cta: {
      title: "Attract and retain more right-fit families",
      text: "Schedule a free website consultation to see how we can help.",
      button: "Schedule a call",
      href: o.ctaHref ?? "https://banner61.com",
    },
    sources: [
      `Search results and Google Maps rankings: DataForSEO, Google, ${d.input.city}, ${d.input.state}, keyword "${d.input.keyword}"`,
      "Page speed: Google PageSpeed Insights (Lighthouse), mobile and desktop",
      "Accessibility: Google Lighthouse and axe-core 4.10, homepage",
      "On-page SEO, tracking, links, and forms: live page source of the homepage and key inner pages",
      "AI-assisted grades: scored against Banner 61's rubric using only the collected page content; every grade cites text from the site",
    ],
  };
}
