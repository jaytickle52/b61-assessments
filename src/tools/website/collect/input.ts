import type { CollectInput } from "./types";

// Kept apart from the collectors so the intake endpoint can use it without loading
// headless Chrome or reading the in-page scripts from disk.
/** Normalize the intake form's URL into collector input. The keyword defaults to "christian school <city>". */
export function toInput(f: { url: string; city: string; state: string; schoolName: string; keyword?: string }): CollectInput {
  const u = new URL(/^https?:\/\//.test(f.url) ? f.url : `https://${f.url}`);
  return {
    url: `${u.protocol}//${u.host}/`,
    domain: u.host.replace(/^www\./, "").toLowerCase(),
    keyword: (f.keyword?.trim() || `christian school ${f.city}`).toLowerCase(),
    city: f.city.trim(),
    state: f.state.trim().toUpperCase().slice(0, 2),
    schoolName: f.schoolName.trim(),
  };
}
