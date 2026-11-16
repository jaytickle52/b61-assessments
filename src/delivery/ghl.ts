import type { ReportData } from "../engine/contract";
import { summarize } from "../engine/scoring";

// Upserts the requester as a GHL contact with tags and the report link, and optionally opens an
// opportunity. Needs GHL_API_KEY (private integration token) and GHL_LOCATION_ID.
// Custom field keys are configured in env so they can match whatever exists in the location.

const API = "https://services.leadconnectorhq.com";
const headers = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY}`,
  Version: "2021-07-28",
  "Content-Type": "application/json",
  Accept: "application/json",
});

export async function pushLead(
  c: { name: string; email: string; phone?: string; role?: string; org: string; websiteManager?: string; schoolSize?: string },
  r: ReportData,
  link: string
) {
  if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) return null;
  const s = summarize(r);
  const [firstName, ...rest] = c.name.trim().split(/\s+/);
  const toolTag = r.tool === "website-report-card" ? "lead-magnet:website-report-card" : "lead-magnet:marketing-assessment";
  const customFields = [
    process.env.GHL_FIELD_REPORT_LINK && { key: process.env.GHL_FIELD_REPORT_LINK, field_value: link },
    process.env.GHL_FIELD_REPORT_SCORE && { key: process.env.GHL_FIELD_REPORT_SCORE, field_value: String(s.overall ?? "") },
    process.env.GHL_FIELD_WEBSITE_MANAGER && c.websiteManager && { key: process.env.GHL_FIELD_WEBSITE_MANAGER, field_value: c.websiteManager },
  ].filter(Boolean);

  const res = await fetch(`${API}/contacts/upsert`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      firstName,
      lastName: rest.join(" "),
      email: c.email,
      phone: c.phone || undefined,
      companyName: c.org,
      website: r.url,
      source: `Banner 61 ${r.tool === "website-report-card" ? "Website Report Card" : "Marketing Assessment"} (free)`,
      tags: [toolTag, c.websiteManager ? `website-manager:${c.websiteManager.toLowerCase().replace(/\W+/g, "-")}` : null, c.schoolSize ? `school-size:${c.schoolSize}` : null].filter(Boolean),
      customFields,
    }),
  });
  if (!res.ok) throw new Error(`GHL upsert ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const contactId: string = (await res.json()).contact?.id;

  if (contactId && process.env.GHL_PIPELINE_ID && process.env.GHL_PIPELINE_STAGE_ID) {
    await fetch(`${API}/opportunities/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        pipelineId: process.env.GHL_PIPELINE_ID,
        pipelineStageId: process.env.GHL_PIPELINE_STAGE_ID,
        contactId,
        name: `${r.school}: free ${r.tool === "website-report-card" ? "Website Report Card" : "Marketing Assessment"} (${s.overall ?? "?"}%)`,
        status: "open",
      }),
    }).catch(() => undefined); // the contact matters more than the opportunity
  }
  return contactId;
}
