"use client";
import { use, useEffect, useState } from "react";

type S = { status: string; step?: string; school?: string; overall?: number | null; error?: string | null };

export default function Status({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [s, setS] = useState<S>({ status: "queued", step: "Getting started" });

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const r = await fetch(`/api/status?token=${encodeURIComponent(token)}`).then((x) => x.json()).catch(() => null);
      if (stop || !r) return;
      setS(r);
      if (r.status === "ready") window.location.href = `/r/${token}`;
      else if (r.status !== "failed" && r.status !== "missing") setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; };
  }, [token]);

  return (
    <main className="status wrap" aria-live="polite">
      {s.status === "failed" ? (
        <>
          <h2>We hit a snag</h2>
          <p>We couldn't finish the report for {s.school ?? "your school"}. This usually means the website blocked our scan or took too long to load. Email <a href="mailto:jay@banner61.com">jay@banner61.com</a> and we'll run it by hand.</p>
        </>
      ) : s.status === "missing" ? (
        <><h2>Report not found</h2><p>Check the link in your email.</p></>
      ) : (
        <>
          <div className="spinner" aria-hidden="true" />
          <h2>Building your Report Card</h2>
          <p><strong>{s.step}</strong></p>
          <p className="fine">This usually takes 2 to 4 minutes. You can leave this page; we'll email the link when it's ready.</p>
        </>
      )}
    </main>
  );
}
