import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { toInput } from "@/tools/website/collect";

// Intake endpoint for both tools. Adds the requester's IP for rate limiting and normalizes the
// school's website domain, which is what search results are matched against (not the email domain).

export async function POST(req: Request) {
  const body = await req.json();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined;
  if (body.company) return NextResponse.json({ token: "ok" }); // honeypot field, filled only by bots
  const cx = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  try {
    const contact = {
      name: String(body.name ?? "").trim(),
      email: String(body.email ?? "").trim().toLowerCase(),
      phone: body.phone ? String(body.phone).trim() : undefined,
      role: body.role ? String(body.role) : undefined,
      org: String(body.school ?? "").trim(),
      websiteManager: body.websiteManager ? String(body.websiteManager) : undefined,
      schoolSize: body.schoolSize ? String(body.schoolSize) : undefined,
    };
    if (!contact.name || !contact.org) throw new Error("Please fill in your name and school.");
    let input: any, domain: string | undefined;
    if (body.tool === "website-report-card") {
      input = toInput({ url: String(body.url ?? ""), city: String(body.city ?? ""), state: String(body.state ?? ""), schoolName: contact.org });
      if (!input.city || input.state.length !== 2) throw new Error("Please add your school's city and state.");
      domain = input.domain;
    } else {
      input = { answers: body.answers ?? {} };
    }
    const token = await cx.mutation(anyApi.assessments.request, { tool: body.tool, contact, input, domain, ip });
    return NextResponse.json({ token });
  } catch (e: any) {
    const msg = String(e?.data ?? e?.message ?? "Something went wrong").replace(/^.*Uncaught Error: /, "").split("\n")[0];
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
