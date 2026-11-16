import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const cx = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const s = await cx.query(anyApi.assessments.status, { token });
  return NextResponse.json(s ?? { status: "missing" }, { headers: { "Cache-Control": "no-store" } });
}
