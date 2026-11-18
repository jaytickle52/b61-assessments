"use client";
import { useState } from "react";

// Intake for the free Website Report Card. The school's own website is what we audit and what
// search results are matched against; the requester's email domain is never used for that.

const MANAGERS = ["Internal staff", "An outside agency or freelancer", "A volunteer", "No one right now"];
const SIZES = ["Under 100 students", "100 to 249", "250 to 499", "500 to 999", "1,000+"];

export default function Page() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, tool: "website-report-card" }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.token) {
      setErr(json.error ?? "Something went wrong on our end. Please try again, or email jay@banner61.com.");
      setBusy(false);
      return;
    }
    window.location.href = `/status/${json.token}`;
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand"><img src="/img/banner61-mark.png" alt="" />BANNER61</div>
          <h1>Free Website<br /><span>Report Card</span></h1>
          <p className="lede">Discover problems and opportunities with your website. Solve them to increase mission-fit family leads.</p>
        </div>
      </header>
      <main className="wrap grid">
        <div className="card">
          <h2>What you'll get</h2>
          <p>A graded report on your school's website, ready in a few minutes, checked against the same standards we use in our full audits for Christian schools.</p>
          <ul className="list">
            <li>Where you rank on Google and Google Maps for families searching in your city</li>
            <li>Mobile and desktop page speed, from Google's own tools</li>
            <li>An accessibility scan, plus SEO and tracking checks</li>
            <li>How clearly your site invites a family to visit, inquire, and apply</li>
            <li>Specific, plain-language fixes for every low mark</li>
          </ul>
          <p className="fine" style={{ marginTop: 16 }}>Some grades are AI-assisted and labeled as such. Design and storytelling items need human judgment, so they're reviewed by our team in the full Website Report Card.</p>
        </div>
        <form className="card" onSubmit={submit}>
          <label>School website<input name="url" required placeholder="yourschool.org" inputMode="url" /></label>
          <label>School name<input name="school" required /></label>
          <div className="row">
            <label>City<input name="city" required /></label>
            <label>State<input name="state" required maxLength={2} placeholder="GA" /></label>
          </div>
          <div className="two">
            <label>Your name<input name="name" required autoComplete="name" /></label>
            <label>Your role<input name="role" placeholder="Head of School" /></label>
          </div>
          <label>Email<small>We'll send the report link here.</small><input name="email" type="email" required autoComplete="email" /></label>
          <div className="two">
            <label>Who manages your website?<select name="websiteManager" defaultValue="">
              <option value="" disabled>Choose one</option>{MANAGERS.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label>School size<select name="schoolSize" defaultValue="">
              <option value="" disabled>Choose one</option>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <input className="hp" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {err && <p className="err" role="alert">{err}</p>}
          <button disabled={busy}>{busy ? "Starting your report..." : "Get my free Report Card"}</button>
          <p className="fine">We'll never share your information. You'll hear from Jay Tickle at Banner 61.</p>
        </form>
      </main>
    </>
  );
}
