// Runs inside the school's homepage after extract.browser.js. Fetches key inner pages
// (same origin, so no CORS issues), the 404 page, robots.txt and sitemap.xml.
// Returns { pages, notFound, robots, sitemap, blog, formFrames }.
(async () => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const origin = location.origin;
  const links = [...document.querySelectorAll("a[href]")]
    .map((a) => ({ text: clean(a.textContent), href: new URL(a.getAttribute("href"), location.href).href.split("#")[0] }))
    .filter((l) => l.href.startsWith(origin) && l.href !== origin + "/");

  const want = [
    ["admissions", /admission/i],
    ["inquiry", /inquir|request info|interest/i],
    ["visit", /visit|tour|open house|shadow/i],
    ["apply", /apply|application/i],
    ["tuition", /tuition|afford|financial|scholarship|esa\b|cost/i],
    ["about", /about|who we are|our story|history/i],
    ["why", /why /i],
    ["spiritual", /spiritual|faith|chapel|discipleship|christian life|bible/i],
    ["academics", /academic|program|curriculum|elementary|preschool|middle|high school/i],
    ["contact", /contact/i],
    ["blog", /news|blog|stories|events/i],
  ];
  const picked = [];
  for (const [label, re] of want) {
    const l = links.find((x) => re.test(x.text) || re.test(new URL(x.href).pathname.replace(/[-_/]/g, " ")));
    if (l && !picked.some((p) => p.url === l.href)) picked.push({ label, url: l.href });
  }

  const textOf = (doc) => {
    doc.querySelectorAll("script,style,noscript,svg").forEach((n) => n.remove());
    return clean(doc.body ? doc.body.textContent : "");
  };
  const get = async (url) => {
    try {
      const r = await fetch(url, { redirect: "follow", credentials: "omit" });
      return { status: r.status, url: r.url, body: await r.text() };
    } catch (e) {
      return { status: 0, url, body: "" };
    }
  };

  const pages = [];
  const formFrames = [];
  for (const p of picked) {
    const r = await get(p.url);
    const doc = new DOMParser().parseFromString(r.body, "text/html");
    doc.querySelectorAll("iframe[src]").forEach((f) => {
      const src = f.getAttribute("src");
      if (/blackbaud|myschoolapp|factsmgt|sis\.facts|finalsite|jotform|formstack|leadconnector|msgsndr|hsforms|hubspot|cognitoforms|google\.com\/forms|typeform|ravenna|sendgrid|wufoo|gravity/i.test(src))
        formFrames.push({ page: p.label, url: new URL(src, p.url).href });
    });
    const nativeForms = [...doc.querySelectorAll("form")].map((f) => {
      const inputs = [...f.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")];
      return {
        fields: inputs.length,
        required: inputs.filter((i) => i.required || i.getAttribute("aria-required") === "true" || /\*/.test((i.closest("label, div")?.textContent || ""))).length,
        labels: inputs.map((i) => clean(i.getAttribute("aria-label") || i.getAttribute("placeholder") || i.name || "")).filter(Boolean).slice(0, 20),
      };
    }).filter((f) => f.fields >= 3);
    pages.push({
      label: p.label,
      url: r.url || p.url,
      status: r.status,
      title: doc.title,
      headings: [...doc.querySelectorAll("h1,h2,h3")].map((h) => h.tagName + ": " + clean(h.textContent)).filter((x) => x.length > 4).slice(0, 30),
      text: textOf(doc).slice(0, 5000),
      nativeForms,
    });
  }

  const nf = await get(origin + "/b61-check-" + Math.random().toString(36).slice(2, 8));
  const nfDoc = new DOMParser().parseFromString(nf.body, "text/html");
  const nfText = textOf(nfDoc).slice(0, 600);
  const genericNF = /^(404|not found|page not found)[\s.!]*$/i.test(nfText) || nfText.length < 40 ||
    /we couldn.t find the page you were looking for/i.test(nfText) && nfDoc.querySelectorAll("a").length < 5;

  const robots = await get(origin + "/robots.txt");
  const rtxt = robots.status === 200 ? robots.body : "";
  const groups = rtxt.split(/\n(?=user-agent)/i);
  const blocksGoogle = groups.some((g) => /user-agent:\s*(\*|googlebot)\s*$/im.test(g) && /^disallow:\s*\/\s*$/im.test(g));
  const aiBlocks = ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Google-Extended", "PerplexityBot"].filter((b) =>
    groups.some((g) => new RegExp("user-agent:\\s*" + b, "i").test(g) && /^disallow:\s*\/\s*$/im.test(g))
  );

  let smUrl = (rtxt.match(/^sitemap:\s*(\S+)/im) || [])[1] || origin + "/sitemap.xml";
  let sm = await get(smUrl);
  if (sm.status !== 200 && smUrl !== origin + "/sitemap_index.xml") { smUrl = origin + "/sitemap_index.xml"; sm = await get(smUrl); }
  let urlCount = (sm.body.match(/<loc>/g) || []).length;
  const childMaps = [...sm.body.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(0, 8);
  if (childMaps.length) {
    urlCount = 0;
    for (const c of childMaps) urlCount += ((await get(c)).body.match(/<url>/g) || []).length;
  }

  const blogPage = pages.find((p) => p.label === "blog");
  const dates = blogPage ? [...(blogPage.text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2},? 20\d\d\b|\b\d{1,2}\/\d{1,2}\/20\d\d\b/g))].map((m) => m[0]) : [];
  const parsed = dates.map((d) => new Date(d.replace("Sept", "Sep"))).filter((d) => !isNaN(d)).sort((a, b) => b - a);

  return {
    pages,
    formFrames,
    notFound: { status: nf.status, custom: !(genericNF), text: nfText },
    robots: { status: robots.status, blocksGoogle, aiBlocks },
    sitemap: { status: sm.status, urlCount, url: smUrl },
    blog: {
      url: blogPage ? blogPage.url : null,
      latestPostDate: parsed[0] ? parsed[0].toISOString().slice(0, 10) : null,
      recentTitles: blogPage ? blogPage.headings.slice(0, 8) : [],
    },
  };
})();
