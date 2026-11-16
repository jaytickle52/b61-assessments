import { Resend } from "resend";
import type { ReportData } from "../engine/contract";
import { summarize } from "../engine/scoring";

// Sends the finished report link from a real inbox (never a no-reply address), so a school's
// reply reaches Jay. FROM and REPLY_TO come from env so they can change without a deploy.

const FROM = process.env.REPORT_FROM ?? "Jay Tickle <jay@banner61.com>";
const REPLY_TO = process.env.REPORT_REPLY_TO ?? "jay@banner61.com";

export async function emailReport(to: { name: string; email: string }, r: ReportData, link: string) {
  const s = summarize(r);
  const first = to.name.trim().split(/\s+/)[0] || "there";
  const what = r.tool === "website-report-card" ? "Website Report Card" : "Enrollment Marketing Assessment";
  const lowest = s.categories.filter((c) => c.score !== null).sort((a, b) => a.score! - b.score!)[0];
  const text = [
    `Hi ${first},`,
    ``,
    `Your ${what} for ${r.school} is ready:`,
    link,
    ``,
    s.overall !== null ? `Overall score: ${s.overall}%. The biggest opportunity is ${lowest.name} (${lowest.score}%).` : "",
    ``,
    `A few items need human judgment, so they're locked in the free version. If you'd like my team to review those and walk through the whole report with you, just reply to this email or book a time here: ${r.cta.href}`,
    ``,
    `Keep up the Kingdom work,`,
    `Jay Tickle`,
    `Banner 61`,
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");

  // EMAIL_MODE: "off" (default, nothing sends), "test" (every email goes to TEST_EMAIL instead of
  // the requester), "live" (sends to the requester). Flip to live only after Jay approves the copy.
  const mode = process.env.EMAIL_MODE ?? "off";
  if (mode === "off") return { sent: false as const };
  const recipient = mode === "live" ? to.email : process.env.TEST_EMAIL ?? "jay@banner61.com";

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to: [recipient],
    replyTo: REPLY_TO,
    subject: `${mode === "test" ? `[TEST for ${to.email}] ` : ""}Your ${what}: ${r.school}`,
    text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { sent: true as const };
}
