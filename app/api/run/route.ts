import { after, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { collectWebsite, toInput } from "@/tools/website/collect";
import { gradeWithAi, validate } from "@/tools/website/ai";
import { buildWebsiteReport } from "@/tools/website/build";
import { buildMarketingReport } from "@/tools/marketing/definition";
import { overallScore } from "@/engine/scoring";
import { emailReport } from "@/delivery/email";
import { pushLead } from "@/delivery/ghl";

// The worker. Convex calls this with a job id; we answer 202 right away and do the work after
// the response, inside the same function invocation (up to maxDuration).

export const runtime = "nodejs";
export const maxDuration = 300;

const api = anyApi;
const secret = process.env.WORKER_SECRET!;

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json();
  after(() => runJob(id));
  return NextResponse.json({ ok: true }, { status: 202 });
}

async function runJob(id: string) {
  const cx = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const step = (s: string, status?: "collecting" | "grading") => cx.mutation(api.assessments.progress, { secret, id, step: s, status });
  try {
    const a: any = await cx.query(api.assessments.get, { secret, id });
    if (!a) return;
    const link = `${process.env.APP_URL}/r/${a.token}`;
    const contact = { name: a.contact.name, org: a.contact.org, email: a.contact.email, phone: a.contact.phone ?? "" };
    let report;

    if (a.tool === "website-report-card") {
      let collected = a.collected;
      let coverStorageId = a.coverStorageId;
      if (!collected) {
        await step("Reading your website, checking search results and page speed", "collecting");
        const { data, coverPng, warnings } = await collectWebsite(toInput(a.input));
        const upload = await cx.mutation(api.assessments.uploadUrl, { secret });
        const put = await fetch(upload, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: new Uint8Array(coverPng) });
        coverStorageId = (await put.json()).storageId;
        collected = data;
        await cx.mutation(api.assessments.saveCollected, { secret, id, collected, coverStorageId, warnings });
      }
      await step("Grading 45 items against the Banner 61 rubric", "grading");
      const ai = a.ai ? validate({ items: a.ai.kept }, collected) : await gradeWithAi(collected);
      report = buildWebsiteReport(collected, { preparedFor: contact, ai, coverShot: "__COVER__", ctaHref: process.env.CTA_URL });
      await cx.mutation(api.assessments.finish, { secret, id, report, ai, overall: overallScore(report) ?? undefined });
    } else {
      await step("Scoring your answers", "grading");
      report = buildMarketingReport(a.input.answers ?? {}, contact, process.env.CTA_URL);
      await cx.mutation(api.assessments.finish, { secret, id, report, ai: null, overall: overallScore(report) ?? undefined });
    }

    // Delivery: failures here don't fail the report; the family already sees it on the page.
    const [ghl, mail] = await Promise.allSettled([pushLead(a.contact, report, link), emailReport(a.contact, report, link)]);
    await cx.mutation(api.assessments.delivered, {
      secret, id,
      ghlContactId: ghl.status === "fulfilled" && ghl.value ? ghl.value : undefined,
      emailedAt: mail.status === "fulfilled" && mail.value.sent ? Date.now() : undefined,
    });
    if (ghl.status === "rejected") console.error("GHL", ghl.reason);
    if (mail.status === "rejected") console.error("Email", mail.reason);
  } catch (e: any) {
    console.error("job failed", id, e);
    await cx.mutation(api.assessments.fail, { secret, id, error: String(e?.message ?? e).slice(0, 500) }).catch(() => undefined);
  }
}
