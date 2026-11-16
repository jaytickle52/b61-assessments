import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Grade, ReportItem } from "../../engine/contract";
import type { CollectedData } from "./collect/types";
import { ITEMS } from "./items";

// Tier 2 grading: a model grades the "ai" items against Jay's calibration notes from the
// B61-Website Report Card skill, using only the crawled data. Every grade must cite evidence
// that appears verbatim in that data; grades that can't be backed up are dropped to "unassessed"
// rather than published. AI-graded items are labeled as such in the report.

export const GRADER_MODEL = process.env.GRADER_MODEL ?? "claude-sonnet-5-5";

/** Jay's calibration notes, per item, lifted from the skill. This is the rubric the model follows. */
export const CALIBRATION: Record<string, string> = {
  "ux.nav":
    "Label every main-menu item by audience: prospective families (pro), current families (cur), donors (don), everyone (gen). A menu dominated by current-family and donor items, or one with no Academics section, is a C at best. A GIVE or Support button in the menu is mentioned here but graded under Primary CTA. Mobile menu problems belong here. Return a nav visual listing each top-level item with its audience.",
  "ux.scannable":
    "Short chunks earn an A, even with a few centered-text sections; note those as the exception. Long unbroken paragraphs on key pages lower the grade.",
  "content.grunt":
    "A visible CTA in the header (for example Visit Us) plus a quick-link strip just below the hero counts as a clear next step; don't mark down for no button inside the hero. If the hero says what the school is but not its location or grades, that's a B; recommend a supporting line with grades and city. A hero slogan that says neither what nor where, with no next step, is a C or lower.",
  "content.prospective":
    "A homepage built around calendars, portals, and donors is a D. A homepage that walks a new family through academics, admissions, and a visit invitation is an A or B even if it also has a parent-organization or church section.",
  "content.spiritual":
    "Clearly Christ-centered but with no page dedicated to spiritual life is a C; recommend a Spiritual Life page that shows discipleship in practice (chapel, Bible class, prayer, service). A dedicated page with specifics is an A.",
  "content.path":
    "An Admissions page with Apply and Open House links, but no simple step-by-step process, is a C. A clear numbered process in text earns an A, even if it sits in a carousel. A process shown only as an image is a mark against it. Return a path visual with the school's own step names when a process exists.",
  "conv.primary-cta":
    "The right action (tour or visit) in the header but a giving button that looks more prominent beside it is a B. Describe the problem as prominence, not contrast (contrast belongs only in Accessibility). GIVE as the only or main header button is an F. 'Learn More' buttons that open email are weak CTAs. Check that admissions buttons don't lead to broken pages.",
  "conv.forms":
    "Grade every path a family can take (contact form, tour scheduler, inquiry form). If the contact form and tour booking are simple and only the SIS inquiry form (FACTS, Blackbaud, Finalsite) is long, that's a B; name the long form as the one problem. Simple contact form plus online tour self-booking and no long form is an A. A long first-touch form (10+ fields, most required) as the only path is a D.",
  "conv.credibility":
    "Accreditation plus real news or media coverage earns an A. Accreditation with logos on the About page, without news coverage, is a B. Logos may be images, not text; the crawl notes logo images when found. No accreditation or trust signals anywhere is a D or F.",
  "conv.lead-magnet":
    "None is an F. Suggest a guide built from content the school already has (tuition, scholarships, ESA or tax-credit programs named on its own pages). A downloadable guide or email opt-in that offers something useful earns an A.",
  "conv.secondary-cta":
    "Secondary CTAs (open house RSVP, newsletter, social follow, 'see our programs') engage families not ready to visit. Several clear secondary paths is an A or B; none is a D.",
  "conv.testimonials":
    "One quote somewhere on the site is a D. None is an F. Scripture quotations and mission statements are not testimonials. Google no longer shows K-12 reviews; never recommend asking for Google reviews. Recommend getting parent quotes onto the program and admissions pages.",
};

const VOICE = `Write to the head of school or admissions director: plain, direct, warm, specific. Short sentences.
Never use em dashes; use a period, a colon, or a comma. Write number ranges as "2 to 3".
No "It's not X, it's Y" constructions. Never use "leverage," "seamless," "transformative," or "robust."
Every "found" must name something real on this school's site, with the actual evidence (real headings, button labels, page names).
Don't open with unsupported claims about what parents want.
When an item earns an A, "found" is a short positive description and "rec" is omitted.`;

const Out = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      g: z.enum(["A", "B", "C", "D", "F"]),
      found: z.string(),
      rec: z.string().optional(),
      evidence: z.array(z.string()).min(1),
      visual: z.any().optional(),
    })
  ),
});
export type AiOutput = z.infer<typeof Out>;

/** The text the model is allowed to cite: homepage text, headings, menu, buttons, inner pages, forms. */
export function corpus(d: CollectedData): string {
  return [
    d.home.title,
    d.home.text,
    d.home.headings.map((h) => h.text).join(" \n "),
    d.home.navItems.map((n) => [n.text, ...n.children].join(" \n ")).join(" \n "),
    d.home.ctas.map((c) => c.text).join(" \n "),
    ...d.pages.map((p) => [p.title, ...(p.headings ?? []), p.text].join(" \n ")),
    ...d.forms.map((f) => [f.provider, ...f.labels, ...f.notes].join(" \n ")),
  ].join(" \n ");
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9$%'" ]+/g, " ").replace(/\s+/g, " ").trim();

/** Keep a grade only if every evidence quote (at least 3 words, or a short label) appears in the crawl. */
export function validate(out: AiOutput, d: CollectedData): { kept: AiOutput["items"]; dropped: { key: string; reason: string }[] } {
  const hay = norm(corpus(d));
  const allowed = new Set(ITEMS.filter((i) => i.tier === "ai").map((i) => i.key));
  const kept: AiOutput["items"] = [];
  const dropped: { key: string; reason: string }[] = [];
  for (const it of out.items) {
    if (!allowed.has(it.key)) { dropped.push({ key: it.key, reason: "not an AI-graded item" }); continue; }
    const missing = it.evidence.filter((e) => !hay.includes(norm(e)));
    if (missing.length) { dropped.push({ key: it.key, reason: `evidence not found in crawl: ${missing.map((m) => `"${m}"`).join(", ")}` }); continue; }
    kept.push({ ...it, found: noDashes(it.found), rec: it.rec ? noDashes(it.rec) : undefined });
  }
  for (const k of allowed) if (!kept.some((i) => i.key === k) && !dropped.some((x) => x.key === k)) dropped.push({ key: k, reason: "model returned no grade" });
  return { kept, dropped };
}

// A comma reads correctly in nearly every spot an em dash was used; a period would need re-capitalizing.
export const noDashes = (s: string) => s.replace(/\s*—\s*/g, ", ").replace(/\s*–\s*(?=\D)/g, ", ").replace(/(\d)\s*[–-]\s*(\d)/g, "$1 to $2");

export function buildPrompt(d: CollectedData) {
  const items = ITEMS.filter((i) => i.tier === "ai").map((i) => `- ${i.key} | ${i.t} | ${i.i} impact\n  Rubric: ${CALIBRATION[i.key]}`).join("\n");
  const data = {
    school: d.input.schoolName,
    city: `${d.input.city}, ${d.input.state}`,
    homepage: {
      title: d.home.title,
      headings: d.home.headings,
      menu: d.home.navItems,
      buttonsAndLinks: d.home.ctas.map((c) => ({ text: c.text, href: c.href, inHeader: c.inHeader, aboveFold: c.aboveFold, styledAsButton: c.isButton, color: c.bg })),
      text: d.home.text,
      emailOptIn: d.home.emailOptIn,
      downloads: d.home.downloadLinks,
      socialLinks: d.home.socialLinks,
    },
    innerPages: d.pages.map((p) => ({ label: p.label, url: p.url, status: p.status, title: p.title, headings: p.headings, text: p.text })),
    forms: d.forms,
  };
  const system = `You grade items for Banner 61's free Website Report Card, an audit of K-12 Christian school websites.
Grade only from the crawl data provided. If the data can't support a grade, leave the item out.
Grades: A (excellent), B (good), C (passable), D (needs improvement), F (failed). Follow each item's rubric exactly; it encodes how Jay Tickle grades.
${VOICE}
For each item return: key, g, found, optional rec, evidence (1 to 4 short exact quotes copied from the crawl data that support the grade; copy them character for character, 3 to 12 words each, or an exact button or menu label), and an optional visual.
Visual shapes: {"type":"nav","items":[["Label","pro|cur|don|gen"],...]} for ux.nav; {"type":"path","steps":["..."]} for content.path; {"type":"fields","required":n,"optional":n,"recommended":n} for conv.forms when a long form exists.
Return only JSON: {"items":[...]}`;
  const user = `Items to grade:\n${items}\n\nCrawl data:\n${JSON.stringify(data)}`;
  return { system, user };
}

export async function gradeWithAi(d: CollectedData, client = new Anthropic()) {
  const { system, user } = buildPrompt(d);
  const res = await client.messages.create({
    model: GRADER_MODEL,
    max_tokens: 6000,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return validate(Out.parse(json), d);
}

/** Merge validated AI output into report items. Dropped items become unassessed, never guessed. */
export function aiItems(kept: AiOutput["items"], dropped: { key: string; reason: string }[]): Record<string, Omit<ReportItem, "key" | "t" | "i" | "why">> {
  const out: Record<string, Omit<ReportItem, "key" | "t" | "i" | "why">> = {};
  for (const k of kept) out[k.key] = { g: k.g as Grade, found: k.found, rec: k.rec, visual: k.visual, source: "ai" };
  for (const x of dropped)
    if (!out[x.key]) out[x.key] = { unassessed: true, source: "ai", found: "We couldn't grade this item reliably from the automated scan, so it isn't scored here. It's covered in the full Website Report Card." };
  return out;
}
