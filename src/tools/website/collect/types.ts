// Everything the collector gathers for one school. Rules and the AI grader read only this,
// so a fixture of this shape is enough to reproduce any report.

export interface CollectInput {
  url: string; // the school's website, as entered on the intake form
  domain: string; // registrable host without www, used to match search results
  keyword: string; // default "christian school <city>"
  city: string;
  state: string; // two-letter
  schoolName?: string;
}

export interface HomeExtract {
  finalUrl: string;
  title: string;
  metaDescription: string | null;
  headings: { tag: string; text: string }[];
  og: Record<string, string>;
  schemaTypes: string[];
  images: { src: string; alt: string | null; background?: boolean }[];
  h1Count: number;
  viewport: string | null;
  analyticsScript: boolean;
  analytics: { ga4Ids: string[]; gtmIds: string[]; uaIds: string[] };
  pixel: boolean;
  telLinks: { href: string; text: string; inHeader: boolean; inFooter: boolean }[];
  phonesInText: string[];
  ctas: { text: string; href: string; inHeader: boolean; aboveFold: boolean; isButton: boolean; bg?: string }[];
  navItems: { text: string; href: string; children: string[] }[];
  keyLinks: { text: string; href: string }[];
  socialLinks: string[];
  wordCount: number;
  text: string; // visible text, trimmed to ~8000 chars
  addressInFooter: string | null;
  mapEmbed: boolean;
  landmarks: { header: boolean; nav: number; main: boolean; footer: boolean; skipLink: boolean; lang: string | null };
  videos: number;
  emailOptIn: boolean;
  downloadLinks: { text: string; href: string }[];
}

export interface PageCheck {
  label: string; // admissions, inquiry, contact, tuition, about, why, spiritual, blog, ...
  url: string;
  status: number;
  title?: string;
  text?: string; // visible text, trimmed
  headings?: string[];
}

export interface FormCheck {
  page: string;
  url: string; // form or iframe URL
  provider: string; // "native", "Blackbaud", "FACTS", "Finalsite", "Jotform", "GHL", ...
  fields: number | null; // null when it could not be read
  required: number | null;
  labels: string[];
  notes: string[];
}

export interface CollectedData {
  input: CollectInput;
  collectedAt: string; // ISO
  home: HomeExtract;
  pages: PageCheck[];
  notFound: { status: number; custom: boolean; text: string };
  robots: { status: number; blocksGoogle: boolean; aiBlocks: string[] };
  sitemap: { status: number; urlCount: number; url: string };
  wwwRedirect: { from: string; to: string; ok: boolean };
  https: boolean;
  headers: { server?: string; cdn?: string; contentEncoding?: string; cacheControl?: string };
  forms: FormCheck[];
  blog: { url: string | null; latestPostDate: string | null; recentTitles: string[] };
  serp: {
    keyword: string;
    location: string;
    organic: { rank: number; title: string; url: string; host: string }[];
    schoolRank: number | null;
    degraded: boolean; // DataForSEO returned google.com hosts or errored on first call
    verified: boolean; // matched on real URLs after a clean (re)run
  } | null;
  mapPack: {
    top: { rank: number; title: string; address: string; domain: string | null }[];
    schoolRank: number | null;
    profile: { photos: number | null; hours: boolean; category: string | null; description: boolean } | null;
  } | null;
  pagespeed: {
    mobile: SpeedRun;
    desktop: SpeedRun;
    imageSavingsKiB: number | null;
    cacheSavingsKiB: number | null;
    unsizedImages: boolean | null;
    totalKiB: number | null;
    textCompression: boolean | null;
  } | null;
  lighthouseA11y: number | null;
  axe: {
    violations: { id: string; help: string; impact: string; tags: string[]; nodes: number }[];
    passes: number;
    incompleteContrast: number;
  } | null;
  screenshots: { cover?: string };
}

export interface SpeedRun {
  score: number;
  fcp: number; // s
  lcp: number; // s
  si: number; // s
  tbt: number; // ms
  cls: number;
  opportunities: { title: string; savings: string }[];
}
