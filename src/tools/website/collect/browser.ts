import { readFileSync } from "node:fs";
import { join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Page } from "puppeteer-core";
import type { CollectedData, CollectInput, FormCheck, HomeExtract } from "./types";

// Headless Chromium on a Vercel function. Does what the manual skill did in Chrome:
// homepage extraction, inner-page checks, form inspection, axe-core, and the cover screenshot.

// Read lazily: module-level reads crash any route that merely imports this file.
const SRC = () => join(process.cwd(), "src/tools/website/collect");
let scripts: { extract: string; checks: string; axe: string } | null = null;
const loadScripts = () =>
  (scripts ??= {
    extract: readFileSync(join(SRC(), "extract.browser.js"), "utf8"),
    checks: readFileSync(join(SRC(), "checks.browser.js"), "utf8"),
    axe: readFileSync(join(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8"),
  });

const SCHEDULERS = /zenrollment|leadconnector|msgsndr|calendly|acuityscheduling|youcanbook|ravenna|finalsite.*inquiry|schoolmint|blackbaud|myschoolapp|factsmgt/i;

const CDN_HEADERS: [RegExp, string][] = [
  [/^cf-ray$/i, "Cloudflare"], [/^x-amz-cf-id$/i, "Amazon CloudFront"], [/^x-fastly|^fastly/i, "Fastly"],
  [/^x-akamai/i, "Akamai"], [/^x-vercel-id$/i, "Vercel's CDN"], [/^x-nf-request-id$/i, "Netlify's CDN"],
  [/^x-kinsta-cache$/i, "Kinsta's CDN"], [/^x-wpe/i, "WP Engine's CDN"], [/^x-sucuri/i, "Sucuri"], [/^x-bunny|^cdn-pullzone/i, "Bunny CDN"],
];

async function countFormFields(page: Page, url: string): Promise<Pick<FormCheck, "fields" | "required" | "labels">> {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    return await page.evaluate(() => {
      const inputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")].filter(
        (i) => (i as HTMLElement).offsetParent !== null
      ) as HTMLInputElement[];
      return {
        fields: inputs.length,
        required: inputs.filter((i) => i.required || i.getAttribute("aria-required") === "true").length,
        labels: inputs.map((i) => (i.labels?.[0]?.textContent || i.placeholder || i.name || "").trim()).filter(Boolean).slice(0, 25),
      };
    });
  } catch {
    return { fields: null, required: null, labels: [] };
  }
}

async function redirectTarget(url: string) {
  let u = url;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (!r) return null;
    const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc) u = new URL(loc, u).href;
    else return u;
  }
  return u;
}

export async function collectFromBrowser(input: CollectInput): Promise<Omit<CollectedData, "serp" | "mapPack" | "pagespeed" | "lighthouseA11y" | "collectedAt"> & { coverPng: Buffer }> {
  const { extract: EXTRACT, checks: CHECKS, axe: AXE } = loadScripts();
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Banner61-ReportCard");
    const resp = await page.goto(input.url, { waitUntil: "networkidle2", timeout: 45_000 });
    const headersIn = resp?.headers() ?? {};
    await new Promise((r) => setTimeout(r, 1500)); // let sliders and lazy images settle

    const coverPng = (await page.screenshot({ type: "jpeg", quality: 74, clip: { x: 0, y: 0, width: 1440, height: 900 } })) as Buffer;
    const home = (await page.evaluate(EXTRACT)) as HomeExtract;
    const checks: any = await page.evaluate(CHECKS);

    await page.evaluate(AXE);
    const axe: any = await page.evaluate(`axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}})`);

    // Forms: SIS iframes found on inner pages, native forms, and external tour schedulers linked from the homepage.
    const forms: FormCheck[] = [];
    for (const p of checks.pages as any[]) for (const f of p.nativeForms ?? []) forms.push({ page: p.label, url: p.url, provider: "native", fields: f.fields, required: f.required, labels: f.labels, notes: [] });
    const formPage = await browser.newPage();
    for (const f of (checks.formFrames as { page: string; url: string }[]).slice(0, 4)) {
      const provider = (f.url.match(/blackbaud|myschoolapp|factsmgt|finalsite|jotform|formstack|leadconnector|msgsndr|hubspot|cognitoforms|typeform|ravenna|zenrollment/i)?.[0] ?? "embedded").replace(/myschoolapp/i, "Blackbaud").replace(/factsmgt/i, "FACTS").replace(/msgsndr|leadconnector/i, "GoHighLevel");
      forms.push({ page: f.page, url: f.url, provider, ...(await countFormFields(formPage, f.url)), notes: [] });
    }
    const scheduler = home.ctas.find((c) => SCHEDULERS.test(c.href) && /tour|visit|schedul/i.test(c.text));
    if (scheduler && !forms.some((f) => f.url === scheduler.href)) {
      const counted = await countFormFields(formPage, scheduler.href);
      forms.push({ page: "visit", url: scheduler.href, provider: "Online tour scheduler", ...counted, notes: ["Online self-booking for tours"] });
    }

    const host = new URL(home.finalUrl).host.replace(/^www\./, "");
    const altHost = home.finalUrl.includes("://www.") ? host : `www.${host}`;
    const to = await redirectTarget(`http://${altHost}/`);
    const cdn = Object.keys(headersIn).map((h) => CDN_HEADERS.find(([re]) => re.test(h))?.[1]).find(Boolean)
      ?? (/squarespace|wix|cloudflare|shopify|finalsite/i.test(headersIn.server ?? "") ? `${headersIn.server}'s CDN` : undefined);

    return {
      input,
      home,
      pages: checks.pages.map(({ nativeForms, ...p }: any) => p),
      notFound: { status: checks.notFound.status, custom: checks.notFound.custom, text: checks.notFound.text },
      robots: checks.robots,
      sitemap: checks.sitemap,
      blog: checks.blog,
      wwwRedirect: { from: `http://${altHost}/`, to: to ?? "", ok: !!to && new URL(to).host === new URL(home.finalUrl).host },
      https: home.finalUrl.startsWith("https://"),
      headers: { server: headersIn.server, cdn, contentEncoding: headersIn["content-encoding"], cacheControl: headersIn["cache-control"] },
      forms,
      axe: {
        violations: axe.violations.map((v: any) => ({ id: v.id, help: v.help, impact: v.impact, tags: v.tags, nodes: v.nodes.length })),
        passes: axe.passes.length,
        incompleteContrast: axe.incomplete.find((i: any) => i.id === "color-contrast")?.nodes.length ?? 0,
      },
      screenshots: {},
      coverPng,
    };
  } finally {
    await browser.close();
  }
}
