import type { Impact } from "../../engine/contract";

// The 53 Website Report Card items, in report order.
// tier: how the free report handles the item.
//   measured: graded by rules from collected data (rules.ts)
//   ai:       graded by the model against Jay's calibration notes, with cited evidence (ai.ts)
//   locked:   needs human judgment; shown locked in the free report, graded by Jay in the paid audit
export type Tier = "measured" | "ai" | "locked";

export interface ItemDef {
  key: string;
  cat: CategoryId;
  t: string;
  i: Impact;
  tier: Tier;
  why: string;
  compact?: boolean;
}

export type CategoryId = "ux" | "content" | "conversion" | "seo" | "performance" | "accessibility";

export const CATEGORIES: { id: CategoryId; name: string; intro: string; stat?: [string, string] }[] = [
  {
    id: "ux",
    name: "User Experience",
    intro: "This section focuses on your website's visuals and user-friendliness.",
    stat: ["94%", "of people cited web design as the reason they mistrusted or rejected a website."],
  },
  {
    id: "content",
    name: "Page Content",
    intro:
      "Content refers to the text, images, and videos that make up your website. Content is more likely to convert (or drive away) a visitor than any other factor, including design.",
  },
  {
    id: "conversion",
    name: "Conversion Optimization",
    intro:
      "Conversion rate optimization is the process of increasing the percentage of website visitors who take a desired action, like filling out an inquiry form or scheduling a tour.",
  },
  {
    id: "seo",
    name: "SEO / Online Visibility",
    intro: "SEO gives you an edge by bringing more prospective families straight to your website from the searches they make on Google.",
    stat: ["93%", "of online experiences begin with a search engine."],
  },
  {
    id: "performance",
    name: "Performance & Security",
    intro: "Slow pages and security warnings erode trust and engagement. A secure, fast site improves the visitor experience and increases conversions.",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    intro:
      "Web accessibility means designing your site so people with disabilities can perceive, understand, navigate, and interact with it. It also overlaps heavily with good SEO.",
  },
];

export const ITEMS: ItemDef[] = [
  // User Experience (5)
  { key: "ux.design", cat: "ux", t: "Professional Website Design", i: "H", tier: "locked",
    why: "Your website is often a family's first interaction with your school. The way it looks should reflect the quality of the experience you provide." },
  { key: "ux.brand", cat: "ux", t: "Visual Brand Consistency", i: "M", tier: "locked",
    why: "Visual branding includes your logo, color scheme, images, and fonts. Your website's branding should complement your offline branding so families associate the two." },
  { key: "ux.nav", cat: "ux", t: "Clear Navigation and Info Architecture", i: "M", tier: "ai",
    why: "When visitors can't find admissions requirements, tuition, or contact details within 2 to 3 clicks, they often leave." },
  { key: "ux.404", cat: "ux", t: "Custom 404 Page Not Found", i: "L", tier: "measured",
    why: "When visitors hit a generic \"Page Not Found\" error, they're likely to leave. A custom 404 page keeps them on the site and guides them on their way." },
  { key: "ux.scannable", cat: "ux", t: "Scannable Headings and Content Chunks", i: "M", tier: "ai",
    why: "Long blocks of unbroken text overwhelm visitors. Parents scan pages, focusing on headings and the first few words of paragraphs." },

  // Page Content (10)
  { key: "content.grunt", cat: "content", t: "Passes the Grunt Test", i: "H", tier: "ai",
    why: "Prospective families should understand what you offer, how it benefits their child, and what to do next within a few seconds of landing on the homepage." },
  { key: "content.benefits", cat: "content", t: "Features Translated to Benefits & Values", i: "H", tier: "locked",
    why: "Features alone don't persuade. Parents need to understand the benefits and deeper values those features deliver for their child." },
  { key: "content.prospective", cat: "content", t: "Prospective Family Focus", i: "H", tier: "ai",
    why: "Your website's primary job is to attract right-fit families and turn online visitors into campus visitors. Pages should be geared toward prospective families, not those already enrolled." },
  { key: "content.spiritual", cat: "content", t: "Spiritual Formation Highlighted", i: "H", tier: "ai",
    why: "Christian character is where a Christian school can stand apart from every other option a family is considering. It deserves a clear place on the site." },
  { key: "content.photos", cat: "content", t: "Photo Quality and Authenticity", i: "H", tier: "locked",
    why: "Stock or blurry photos undermine credibility. Authentic images of real students and teachers help families picture their child in your community." },
  { key: "content.placement", cat: "content", t: "Purposeful Image Placement and Context", i: "M", tier: "locked",
    why: "Photos placed without supporting nearby content create visual noise. Oversized heroes can push key information below the fold." },
  { key: "content.video", cat: "content", t: "Engaging Video Content", i: "M", tier: "locked",
    why: "Video is easier to consume than text and delivers your message in a uniquely powerful way." },
  { key: "content.path", cat: "content", t: "A Simple Path to Enrollment", i: "M", tier: "ai",
    why: "The enrollment process is a mystery to most families. A clear, simple path removes hesitation." },
  { key: "content.success", cat: "content", t: "A Vivid Picture of Success", i: "H", tier: "locked",
    why: "Families aren't ultimately interested in your school; they're interested in the outcomes their child will experience." },
  { key: "content.identity", cat: "content", t: "Specific, Authentic School Identity", i: "H", tier: "locked",
    why: "Generic claims like \"excellence in education\" could describe any school. Specific stories and details make your school distinct." },

  // Conversion Optimization (7)
  { key: "conv.phone", cat: "conversion", t: "Noticeable Phone Number", i: "H", tier: "measured",
    why: "Families should be able to call you without hunting. A phone number on every page with a working tap-to-call link makes that easy on a phone." },
  { key: "conv.primary-cta", cat: "conversion", t: "Primary Call To Action (CTA)", i: "H", tier: "ai",
    why: "When prospective families can't see the next step, you lose inquiries. Vague CTAs like \"Learn More\" create confusion." },
  { key: "conv.forms", cat: "conversion", t: "Low-Friction Inquiry and Contact Forms", i: "H", tier: "ai",
    why: "Every additional form field reduces completion rates. Save detailed questions for after the first conversation." },
  { key: "conv.credibility", cat: "conversion", t: "Credibility Indicators", i: "H", tier: "ai",
    why: "Trust factors like accreditations, awards, and media coverage prove to visitors that you can be trusted with their child's education." },
  { key: "conv.lead-magnet", cat: "conversion", t: "Lead Magnet", i: "H", tier: "ai",
    why: "Most visitors leave without taking direct action. An opt-in offer captures their email so you can follow up and invite them to visit later." },
  { key: "conv.secondary-cta", cat: "conversion", t: "Secondary Calls To Action", i: "L", tier: "ai",
    why: "Secondary CTAs engage families who aren't ready for the primary step yet." },
  { key: "conv.testimonials", cat: "conversion", t: "Testimonials / Reviews", i: "H", tier: "ai",
    why: "Reviews and testimonials come from the people visitors trust most: real families who trusted your school with their children." },

  // SEO (11 full items + 11 checklist rows)
  { key: "seo.mappack", cat: "seo", t: "Local Google Map Pack Listing", i: "M", tier: "measured",
    why: "When families search locally, Google shows a map with three schools above the regular results. Appearing there drives visibility, calls, and visits." },
  { key: "seo.rank", cat: "seo", t: "Keyword Ranking on Page #1", i: "H", tier: "measured",
    why: "When your site shows on the first page of regular search results, it puts your school in front of prospective families." },
  { key: "seo.title-keyword", cat: "seo", t: "Keyword Used in Page Title", i: "H", tier: "measured",
    why: "Using a keyword in your title tag helps search engines associate your page with a topic." },
  { key: "seo.h1", cat: "seo", t: "Use of Keywords in H1 Tags", i: "H", tier: "measured",
    why: "H1 tags tell search engines and screen readers what a page is about. They should contain your primary keyword." },
  { key: "seo.analytics", cat: "seo", t: "Google Analytics / Tag Manager", i: "H", tier: "measured",
    why: "Analytics help you understand your visitors so you can improve engagement and drive more campus visits." },
  { key: "seo.meta", cat: "seo", t: "Meta Title & Descriptions", i: "M", tier: "measured",
    why: "This search-facing text influences your position in search results and gives searchers context about the page." },
  { key: "seo.alt", cat: "seo", t: "Alt Image Attribute", i: "M", tier: "measured",
    why: "Alt text tells visually impaired visitors what an image shows and helps search engines understand your images." },
  { key: "seo.content", cat: "seo", t: "Sufficient Page Content", i: "M", tier: "measured",
    why: "Search engines favor pages with relevant, substantial content that serves the searcher's intent." },
  { key: "seo.blog", cat: "seo", t: "Blog / Resource Center", i: "M", tier: "measured",
    why: "An active blog improves search position, builds authority, and shows families what life is like at your school." },
  { key: "seo.schema", cat: "seo", t: "Schema Markup", i: "M", tier: "measured",
    why: "Schema markup helps search engines show richer results about your school." },
  { key: "seo.address", cat: "seo", t: "Map & Address", i: "M", tier: "measured",
    why: "Listing your address on every page, with a map on your contact page, supports local search results." },
  { key: "seo.crawlable", cat: "seo", t: "Accessible to Search Engines", i: "H", tier: "measured", compact: true, why: "" },
  { key: "seo.www", cat: "seo", t: "WWW Resolve/Redirect", i: "H", tier: "measured", compact: true, why: "" },
  { key: "seo.name-in-title", cat: "seo", t: "School Name in Page Title", i: "M", tier: "measured", compact: true, why: "" },
  { key: "seo.title-length", cat: "seo", t: "Optimal Page Title Length", i: "M", tier: "measured", compact: true, why: "" },
  { key: "seo.sitemap", cat: "seo", t: "Sitemap.xml File", i: "M", tier: "measured", compact: true, why: "" },
  { key: "seo.indexed", cat: "seo", t: "Website Found on Google", i: "M", tier: "measured", compact: true, why: "" },
  { key: "seo.desc-length", cat: "seo", t: "Meta Description Length", i: "L", tier: "measured", compact: true, why: "" },
  { key: "seo.desc-keyword", cat: "seo", t: "Keywords in the Meta Description", i: "M", tier: "measured", compact: true, why: "" },
  { key: "seo.og", cat: "seo", t: "Open Graph Markup", i: "L", tier: "measured", compact: true, why: "" },
  { key: "seo.alt-keyword", cat: "seo", t: "Keywords in Image Alt Attribute", i: "L", tier: "measured", compact: true, why: "" },
  { key: "seo.pixel", cat: "seo", t: "Facebook Tracking Pixel", i: "M", tier: "measured", compact: true, why: "" },

  // Performance & Security (5)
  { key: "perf.https", cat: "performance", t: "Secure Website Connection (HTTPS)", i: "H", tier: "measured",
    why: "An SSL certificate encrypts information between visitors and your site and tells families the site is authentic." },
  { key: "perf.speed", cat: "performance", t: "Google Page Speed", i: "H", tier: "measured",
    why: "Every second counts while a visitor waits for a page to load. Most parents will see your site on a phone first." },
  { key: "perf.images", cat: "performance", t: "Image & Media Optimization", i: "M", tier: "measured",
    why: "Large, unsized images and autoplaying video are the most common cause of slow school websites." },
  { key: "perf.caching", cat: "performance", t: "Browser Caching & Compression", i: "M", tier: "measured",
    why: "Caching and compression make pages load significantly faster on repeat visits." },
  { key: "perf.cdn", cat: "performance", t: "Utilizes Content Delivery Network", i: "M", tier: "measured",
    why: "A content delivery network (CDN) serves your site from servers close to each visitor, which speeds up load times." },

  // Accessibility (4)
  { key: "a11y.automated", cat: "accessibility", t: "Automated Accessibility Assessment", i: "H", tier: "measured",
    why: "We scanned your homepage with Google Lighthouse and axe-core, the open-source engine behind most professional accessibility checkers. Automated scans catch roughly a third to half of accessibility issues; the rest require manual review." },
  { key: "a11y.alt", cat: "accessibility", t: "Alternative (ALT) Text for Images", i: "M", tier: "measured",
    why: "Alternative text describes images for screen readers and search engines." },
  { key: "a11y.contrast", cat: "accessibility", t: "Color Contrast", i: "M", tier: "measured",
    why: "Text must contrast enough with its background for visitors with low vision or color blindness to read it." },
  { key: "a11y.landmarks", cat: "accessibility", t: "Page Structure & Landmarks", i: "M", tier: "measured",
    why: "Landmarks and skip links let keyboard and screen-reader users move through a page efficiently." },
];

if (ITEMS.length !== 53) throw new Error(`Expected 53 items, found ${ITEMS.length}`);

export const LOCKED_NOTE =
  "This item requires human judgment, so it isn't graded in the free report. Jay and the Banner 61 team review it by hand in the full Website Report Card.";
