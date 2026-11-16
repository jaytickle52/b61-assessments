import { PREPARED_BY, type Grade, type Impact, type ReportData, type ReportItem } from "../../engine/contract";

// Enrollment Marketing Assessment: a questionnaire scored into the same report contract as the
// Website Report Card, so it uses the same pipeline, renderer, email and GHL handoff.
//
// DRAFT: Jay hasn't chosen the question set yet (the 20-question Enrollment System Diagnostic
// or the 36 Key Questions). The questions below are placeholders, two per category, taken from
// the 36 Key Questions so the pipeline can be tested end to end. Replace QUESTIONS when the set
// is chosen; nothing else needs to change.

export interface Question {
  key: string;
  cat: string;
  t: string; // item title in the report
  prompt: string; // what the school answers
  i: Impact;
  why: string;
  options: { label: string; g: Grade; found: string; rec?: string }[];
}

export const MARKETING_CATEGORIES = [
  { id: "admissions", name: "Admissions", intro: "How well your process turns interested families into enrolled families." },
  { id: "retention", name: "Retention", intro: "How well you keep the families you already have." },
  { id: "marketing", name: "Marketing", intro: "How families discover your school and what they hear about it." },
  { id: "tuition", name: "Tuition & Financial Aid", intro: "How you price, fund, and talk about affordability." },
  { id: "staffing", name: "Staffing", intro: "Whether the right people and rhythms are in place to do the work." },
];

export const QUESTIONS: Question[] = [
  { key: "adm.crm", cat: "admissions", t: "Inquiry Tracking", i: "H", prompt: "Where does your inquiry and applicant data live?",
    why: "When families live in sticky notes and inbox threads, follow-ups slip and leads go cold.",
    options: [
      { label: "A CRM we use every day", g: "A", found: "Inquiries and applicants are tracked in a CRM the team uses daily." },
      { label: "A CRM we use some of the time", g: "C", found: "A CRM exists but isn't the single source of truth.", rec: "Make the CRM the only place family status lives, and review it in a weekly admissions meeting." },
      { label: "Spreadsheets", g: "D", found: "Inquiries are tracked in spreadsheets.", rec: "Move to a CRM that logs every touch and reminds you of the next step." },
      { label: "Email and memory", g: "F", found: "There's no system tracking inquiries.", rec: "Start with a simple CRM before adding any new marketing." },
    ] },
  { key: "adm.speed", cat: "admissions", t: "Speed to Lead", i: "H", prompt: "How quickly does a new inquiry usually hear from a person?",
    why: "A reply within hours, not days, builds trust with digital-first parents.",
    options: [
      { label: "Within an hour during school hours", g: "A", found: "New inquiries hear from a person within the hour." },
      { label: "Same day", g: "B", found: "New inquiries hear back the same day." },
      { label: "Within 2 to 3 days", g: "D", found: "Replies take 2 to 3 days.", rec: "Set a same-day standard and an automatic first reply that offers a tour time." },
      { label: "It varies", g: "F", found: "Response time isn't consistent.", rec: "Assign one owner for new inquiries and a same-day standard." },
    ] },
  { key: "ret.process", cat: "retention", t: "Re-enrollment Model", i: "M", prompt: "How do families stay enrolled from year to year?",
    why: "Continuous enrollment removes the spring decision point when families quietly shop around.",
    options: [
      { label: "Continuous enrollment (they opt out)", g: "A", found: "Families stay enrolled until they opt out." },
      { label: "Re-enrollment with early incentives", g: "C", found: "Families re-enroll each year, with early incentives.", rec: "Consider continuous enrollment to remove the annual decision point." },
      { label: "Re-enrollment every spring", g: "D", found: "Every family re-decides each spring.", rec: "Move toward continuous enrollment." },
    ] },
  { key: "ret.survey", cat: "retention", t: "Parent Satisfaction Survey", i: "H", prompt: "How do you measure parent satisfaction?",
    why: "Families who seem fine can leave quietly. An annual survey with Net Promoter Score catches it early.",
    options: [
      { label: "Annual survey with NPS", g: "A", found: "An annual parent survey with Net Promoter Score is in place." },
      { label: "Occasional survey", g: "C", found: "Surveys happen occasionally.", rec: "Run the same anonymous survey every year so you can see trends." },
      { label: "Conversations only", g: "D", found: "Satisfaction is measured informally.", rec: "Add an annual anonymous parent survey with Net Promoter Score." },
    ] },
  { key: "mkt.wom", cat: "marketing", t: "Word-of-Mouth Plan", i: "H", prompt: "How intentional is your word-of-mouth marketing?",
    why: "Most schools rely on passive word of mouth. Effective schools equip their happiest families to share.",
    options: [
      { label: "A formal parent ambassador program", g: "A", found: "A parent ambassador program equips families to share." },
      { label: "We ask for referrals sometimes", g: "C", found: "Referrals are requested now and then.", rec: "Launch a small ambassador group with simple things to share each month." },
      { label: "It just happens", g: "D", found: "Word of mouth is passive.", rec: "Start a parent ambassador program." },
    ] },
  { key: "mkt.messaging", cat: "marketing", t: "Defined Messaging", i: "H", prompt: "Do you have 3 to 5 core message themes everyone uses?",
    why: "Defined messaging keeps every email, post, and tour saying the same true things about your school.",
    options: [
      { label: "Yes, written and used", g: "A", found: "Core message themes are written down and used consistently." },
      { label: "Informally", g: "C", found: "Messaging is understood but not written down.", rec: "Write down 3 to 5 messaging buckets and use them to plan content." },
      { label: "No", g: "F", found: "There's no defined messaging.", rec: "Define 3 to 5 messaging buckets before the next campaign." },
    ] },
  { key: "tui.pricing", cat: "tuition", t: "Tuition Pricing Strategy", i: "M", prompt: "How do you set tuition each year?",
    why: "An intentional pricing strategy protects both enrollment and the budget.",
    options: [
      { label: "Annual strategy based on market and costs", g: "A", found: "Tuition is set from an annual pricing strategy." },
      { label: "A fixed percentage increase", g: "C", found: "Tuition rises by a fixed percentage each year.", rec: "Review peer tuition and cost data each year before setting rates." },
      { label: "Ad hoc", g: "D", found: "Tuition is set without a defined process.", rec: "Build a simple annual pricing review." },
    ] },
  { key: "tui.affordability", cat: "tuition", t: "Marketing Affordability", i: "H", prompt: "How clearly do you show families how they can afford your school?",
    why: "Many families rule a school out on price before they learn about aid, ESAs, or scholarships.",
    options: [
      { label: "A clear affordability page and guide", g: "A", found: "Affordability is explained clearly, with a guide." },
      { label: "Tuition is listed with a note about aid", g: "C", found: "Tuition is listed with a short note about aid.", rec: "Build an affordability page that walks through every way families pay." },
      { label: "Families have to ask", g: "D", found: "Families have to ask about affordability.", rec: "Publish an affordability page." },
    ] },
  { key: "stf.roles", cat: "staffing", t: "Enrollment Roles", i: "H", prompt: "Who handles marketing and admissions?",
    why: "A department of one can't do everything. Knowing capacity keeps the plan realistic.",
    options: [
      { label: "Dedicated people for each", g: "A", found: "Marketing and admissions each have dedicated staff." },
      { label: "One person does both", g: "C", found: "One person carries both marketing and admissions.", rec: "Protect admissions time first and outsource what can be outsourced." },
      { label: "Shared among other duties", g: "D", found: "Enrollment work is spread across other jobs.", rec: "Name one owner for enrollment, even part time." },
    ] },
  { key: "stf.cadence", cat: "staffing", t: "Meeting Cadence", i: "M", prompt: "How often does your enrollment team meet?",
    why: "A weekly rhythm keeps follow-ups moving and problems visible.",
    options: [
      { label: "Weekly", g: "A", found: "The enrollment team meets weekly." },
      { label: "Monthly", g: "C", found: "The team meets monthly.", rec: "Move to a short weekly pipeline meeting." },
      { label: "Rarely", g: "D", found: "The team rarely meets.", rec: "Start a 30-minute weekly enrollment meeting with the head of school." },
    ] },
];

export function buildMarketingReport(
  answers: Record<string, number>,
  contact: { name: string; org: string; email: string; phone: string },
  ctaHref?: string
): ReportData {
  const first = contact.name.trim().split(/\s+/)[0] || "there";
  const categories = MARKETING_CATEGORIES.map((c) => ({
    ...c,
    items: QUESTIONS.filter((q) => q.cat === c.id).map((q): ReportItem => {
      const o = q.options[answers[q.key]];
      return o
        ? { key: q.key, t: q.t, i: q.i, why: q.why, g: o.g, found: o.found, rec: o.rec, source: "self" }
        : { key: q.key, t: q.t, i: q.i, why: q.why, unassessed: true, found: "Not answered." };
    }),
  }));
  const strong = categories.flatMap((c) => c.items).filter((i) => i.g === "A").slice(0, 3);
  return {
    tool: "marketing-assessment",
    tier: "free",
    school: contact.org,
    shortName: contact.org.replace(/\s+(Christian\s+)?(Academy|School|Schools)$/i, ""),
    url: "",
    displayUrl: "",
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }),
    preparedFor: contact,
    preparedBy: PREPARED_BY,
    letter: {
      greeting: `Hi ${first},`,
      paragraphs: [
        `Thank you for taking the Enrollment Marketing Assessment for ${contact.org}. These grades come from your own answers, scored against the standards we use with schools we coach.`,
        "You'll find some low marks and some high marks. Take a moment to celebrate the wins before you dig into the rest.",
        "A few of them are below.",
        `When you see a low mark, imagine the word "Opportunity." That's really what we're talking about.`,
        "You can work through these on your own, share them with your team, or invite Banner 61 to help.",
        "Regardless of your next step, I hope you find this valuable.",
      ],
      wins: strong.map((i) => ({ big: "A", text: i.t })),
    },
    categories,
    closing: {
      greeting: `${first},`,
      paragraphs: ["Thanks for taking the time to work through this.", "If you want help turning these opportunities into more enrolled families, let's talk!"],
      journey: ["Discover", "Engage", "Connect", "Enroll", "Remain", "Refer"],
    },
    cta: { title: "Attract and retain more right-fit families", text: "Schedule a free consultation to see how we can help.", button: "Schedule a call", href: ctaHref ?? "https://banner61.com" },
    sources: ["Your answers to the Enrollment Marketing Assessment"],
  };
}
