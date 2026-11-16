// Runs inside the school's homepage (headless Chromium in production, Chrome when testing).
// Returns a HomeExtract (see types.ts). Keep it dependency-free and self-contained.
(() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const abs = (h) => { try { return new URL(h, location.href).href; } catch { return h || ""; } };
  const html = document.documentElement.outerHTML;
  const header = document.querySelector("header, [role=banner], .header, #header, .site-header");
  const footer = document.querySelector("footer, [role=contentinfo], .footer, #footer, .site-footer");
  const inEl = (el, box) => !!(box && box.contains(el));
  const foldY = window.innerHeight || 900;

  const headings = [...document.querySelectorAll("h1,h2,h3")]
    .filter(vis)
    .map((h) => ({ tag: h.tagName, text: clean(h.textContent).slice(0, 160) }))
    .filter((h) => h.text)
    .slice(0, 80);

  const og = {};
  document.querySelectorAll('meta[property^="og:"]').forEach((m) => (og[m.getAttribute("property")] = m.content));

  const schemaTypes = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const walk = (o) => {
        if (!o || typeof o !== "object") return;
        if (Array.isArray(o)) return o.forEach(walk);
        if (o["@type"]) [].concat(o["@type"]).forEach((t) => schemaTypes.push(String(t)));
        if (o["@graph"]) walk(o["@graph"]);
      };
      walk(JSON.parse(s.textContent));
    } catch {}
  });

  const images = [...document.images]
    .filter((i) => i.naturalWidth > 40 || i.width > 40)
    .map((i) => ({ src: abs(i.currentSrc || i.src), alt: i.hasAttribute("alt") ? i.getAttribute("alt") : null }));

  // Photos placed as CSS backgrounds can't carry alt text, so count them separately.
  const bgPhotos = [...document.querySelectorAll("body *")]
    .map((e) => (getComputedStyle(e).backgroundImage.match(/url\("?([^")]+)/) || [])[1])
    .filter((u) => u && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) && !/logo|icon|pattern|texture|overlay/i.test(u))
    .map((u) => ({ src: abs(u), alt: null, background: true }));

  // Tag IDs must contain a digit; CSS classes like "G-BOTTOM" are not tags. Accept GT- (Google tag) too.
  const ids = (re) => [...new Set((html.match(re) || []).map((x) => x.toUpperCase()))].filter((x) => /\d/.test(x));
  const analytics = {
    ga4Ids: [...ids(/\bG-[A-Z0-9]{8,12}\b/g), ...ids(/\bGT-[A-Z0-9]{6,12}\b/g)],
    gtmIds: ids(/\bGTM-[A-Z0-9]{4,8}\b/g),
    uaIds: ids(/\bUA-\d{4,10}-\d{1,4}\b/g),
  };
  const pixel = /fbq\(|connect\.facebook\.net\/[^"']*fbevents\.js/.test(html);

  const telLinks = [...document.querySelectorAll('a[href^="tel:"]')].map((a) => ({
    href: a.getAttribute("href"),
    text: clean(a.textContent),
    inHeader: inEl(a, header),
    inFooter: inEl(a, footer),
  }));

  const bodyText = clean(document.body.innerText);
  const phonesInText = [...new Set(bodyText.match(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g) || [])].slice(0, 6);

  const ctaRe = /(inquir|visit|tour|apply|enroll|admission|contact|schedule|give|donat|learn more|open house|shadow|request|rsvp|get started)/i;
  const ctas = [...document.querySelectorAll("a, button")]
    .filter((a) => vis(a) && ctaRe.test(a.textContent || ""))
    .map((a) => {
      const r = a.getBoundingClientRect();
      const s = getComputedStyle(a);
      const isButton =
        a.tagName === "BUTTON" ||
        /btn|button/i.test(a.className || "") ||
        (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor) && parseFloat(s.paddingLeft) >= 8);
      return {
        text: clean(a.textContent).slice(0, 60),
        href: a.getAttribute("href") ? abs(a.getAttribute("href")) : "",
        inHeader: inEl(a, header),
        aboveFold: r.top + window.scrollY < foldY,
        isButton: !!isButton,
        bg: s.backgroundColor,
      };
    })
    .slice(0, 40);

  // Main menu: the navigation region with the most same-site links, skipping accessibility
  // toolbars, skip links and footers (Oakwood's first <nav> is an a11y toolbar).
  const navRoot = [...document.querySelectorAll("nav, [role=navigation]")]
    .filter((n) => !/a11y|accessib|toolbar|skip|breadcrumb/i.test((n.id || "") + " " + (n.className || "")) && !n.closest("footer"))
    .map((n) => ({ n, score: [...n.querySelectorAll("a[href]")].filter((a) => a.href.startsWith(location.origin)).length + (n.closest("header") ? 20 : 0) }))
    .sort((a, b) => b.score - a.score)[0]?.n;
  const navItems = [];
  if (navRoot) {
    const tops = navRoot.querySelectorAll(":scope > ul > li, :scope > div > ul > li, :scope ul:first-of-type > li");
    [...tops].slice(0, 14).forEach((li) => {
      const a = li.querySelector("a, button");
      if (!a) return;
      const children = [...li.querySelectorAll("ul a, .folder a, [class*=dropdown] a, [class*=sub] a")]
        .map((x) => clean(x.textContent))
        .filter(Boolean)
        .slice(0, 15);
      navItems.push({ text: clean(a.textContent).slice(0, 40), href: a.getAttribute("href") ? abs(a.getAttribute("href")) : "", children });
    });
  }

  const keyRe = /(admission|inquir|apply|tuition|afford|financial|scholarship|esa|about|why|mission|faith|spiritual|chapel|discipleship|contact|visit|tour|news|blog|academic|program|calendar|portal|give|donat)/i;
  const seen = new Set();
  const keyLinks = [...document.querySelectorAll("a[href]")]
    .map((a) => ({ text: clean(a.textContent).slice(0, 60), href: abs(a.getAttribute("href")) }))
    .filter((l) => l.text && keyRe.test(l.text + " " + l.href) && l.href.startsWith(location.origin))
    .filter((l) => (seen.has(l.href) ? false : seen.add(l.href)))
    .slice(0, 60);

  const socialLinks = [...new Set(
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.href)
      .filter((h) => /facebook\.com|instagram\.com|youtube\.com|linkedin\.com|x\.com|twitter\.com|tiktok\.com|vimeo\.com/.test(h))
  )].slice(0, 12);

  const footerText = footer ? clean(footer.innerText) : "";
  // ZIP is optional: Oakwood's footer reads "113 Oakwood Street, Chickamauga, GA, USA".
  const addr = footerText.match(/\d{1,6}\s+[A-Za-z0-9 .]+?\b(Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Boulevard|Blvd|Highway|Hwy|Way|Parkway|Pkwy|Court|Ct|Circle|Pike)\b\.?,?\s+[A-Za-z .]+,\s*[A-Z]{2}\b(,?\s*(\d{5}|USA))?/);

  const downloadLinks = [...document.querySelectorAll("a[href]")]
    .filter((a) => /\.pdf($|\?)|\/download/i.test(a.getAttribute("href") || "") || /\b(guide|e-?book|checklist|download)\b/i.test(a.textContent || ""))
    .map((a) => ({ text: clean(a.textContent).slice(0, 80), href: abs(a.getAttribute("href")) }))
    .slice(0, 15);

  const emailOptIn = [...document.querySelectorAll("form")].some(
    (f) => f.querySelector('input[type=email], input[name*=email i]') && f.querySelectorAll("input:not([type=hidden])").length <= 4
  );

  return {
    finalUrl: location.href,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content ?? null,
    headings,
    og,
    schemaTypes: [...new Set(schemaTypes)],
    images: [...images, ...bgPhotos.filter((b, i, a) => a.findIndex((x) => x.src === b.src) === i)],
    h1Count: document.querySelectorAll("h1").length,
    viewport: document.querySelector('meta[name="viewport"]')?.content ?? null,
    analyticsScript: /googletagmanager\.com\/gtag\/js|google-analytics\.com\/(g\/)?collect|googletagmanager\.com\/gtm\.js/.test(html),
    analytics,
    pixel,
    telLinks,
    phonesInText,
    ctas,
    navItems,
    keyLinks,
    socialLinks,
    wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    text: bodyText.slice(0, 8000),
    addressInFooter: addr ? clean(addr[0]) : null,
    mapEmbed: !!document.querySelector('iframe[src*="google.com/maps"], iframe[src*="maps.google"], [class*=map] iframe'),
    landmarks: {
      header: !!document.querySelector("header, [role=banner]"),
      nav: document.querySelectorAll("nav, [role=navigation]").length,
      main: !!document.querySelector("main, [role=main]"),
      footer: !!document.querySelector("footer, [role=contentinfo]"),
      skipLink: [...document.querySelectorAll('a[href^="#"]')].some((a) => /skip/i.test(a.textContent || "")),
      lang: document.documentElement.getAttribute("lang"),
    },
    videos: document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"]').length,
    emailOptIn,
    downloadLinks,
  };
})();
