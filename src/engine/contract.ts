// The report contract shared by every Banner 61 assessment tool.
// It matches the JSON block the New Hope report template renders, plus three
// additions the free tools need: `locked`, `source` and `tool`.

export type Grade = "A" | "B" | "C" | "D" | "F";
export type Impact = "H" | "M" | "L";

/** How a grade was produced. Shown to readers so they know what to trust. */
export type GradeSource =
  | "measured" // computed by rules from collected data
  | "ai" // graded by a model against Jay's rubric, with cited evidence
  | "self" // from the school's own answers (marketing assessment)
  | "human"; // graded by Jay (paid audit)

export type Visual =
  | { type: "shots"; shots: { src: string; alt: string; cap: string }[] }
  | { type: "nav"; items: [string, "pro" | "cur" | "don" | "gen"][] }
  | { type: "path"; steps: string[] }
  | { type: "compare"; bad: [string, string]; good: [string, string]; plain?: boolean }
  | { type: "fields"; required: number; optional: number; recommended: number }
  | { type: "table"; cols: string[]; rows: string[][]; highlight?: number; mono?: number }
  | { type: "serp"; rows: [string, string, string][]; absent?: string; rank?: number }
  | {
      type: "speed";
      scores: { mobile: number; desktop: number };
      metrics: { name: string; unit: "s" | "ms" | ""; mobile: number; desktop: number; good: number; poor: number }[];
      note: string;
    }
  | { type: "axe"; lighthouse: number; issues: [string, string, string, number][]; note: string }
  | { type: "dots"; good: number; file: number; empty: number };

export interface ReportItem {
  /** Stable key, e.g. "seo.title-keyword". */
  key: string;
  /** Grade. Omitted when the item is locked or could not be assessed. */
  g?: Grade;
  t: string;
  i: Impact;
  why?: string;
  found?: string;
  lead?: string;
  bullets?: string[];
  after?: string;
  rec?: string;
  visual?: Visual;
  compact?: boolean;
  /** Reserved for the human review in the paid audit. Not scored. */
  locked?: boolean;
  /** Collected but not gradable this run (e.g. a SIS form that would not load). Not scored. */
  unassessed?: boolean;
  source?: GradeSource;
}

export interface Category {
  id: string;
  name: string;
  intro: string;
  stat?: [string, string];
  items: ReportItem[];
}

export interface Person {
  name: string;
  org: string;
  email: string;
  phone: string;
}

export interface ReportData {
  tool: "website-report-card" | "marketing-assessment";
  tier: "free" | "paid";
  school: string;
  shortName: string;
  url: string;
  displayUrl: string;
  date: string;
  preparedFor: Person;
  preparedBy: Person & { title: string; site: string };
  coverShot?: string;
  letter: { greeting: string; paragraphs: string[]; wins: { big: string; text: string }[] };
  categories: Category[];
  closing: { greeting: string; paragraphs: string[]; journey: string[] };
  cta: { title: string; text: string; button: string; href: string };
  sources: string[];
}

export const PREPARED_BY: ReportData["preparedBy"] = {
  name: "Jay Tickle",
  title: "Owner",
  org: "Banner 61",
  email: "jay@banner61.com",
  phone: "864-477-4688",
  site: "https://banner61.com",
};
