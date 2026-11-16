import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { renderReport } from "@/render/render";

// Serves a finished report as a full HTML page at /r/<token>.

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cx = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const found: any = await cx.query(anyApi.assessments.byToken, { token });
  if (!found) return new Response("This report isn't ready yet, or the link is wrong.", { status: 404 });
  const report = { ...found.report, coverShot: found.cover ?? undefined };
  // The template references the Banner 61 mark at img/banner61-mark.png; serve it from /public.
  const html = renderReport(report).replaceAll('src="img/banner61-mark.png"', 'src="/img/banner61-mark.png"');
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}
