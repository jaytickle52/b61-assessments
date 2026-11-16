# Banner 61 Assessments

Free, automated lead magnets for Christian schools, built on one shared engine:

1. **Website Report Card** (working): a school enters its website, city and state, and gets a graded report in 2 to 4 minutes with no input from Jay.
2. **Enrollment Marketing Assessment** (plumbing done, questions in draft): a questionnaire scored into the same report.

Both produce the same report contract (`src/engine/contract.ts`), render through the approved New Hope template, and share intake, job pipeline, email and GHL handoff. A paid audit picks up from the free report's collected data.

## How the Website Report Card grades the 53 items

| Tier | Items | How | In the free report |
|---|---|---|---|
| Measured | 33 | Rules in `src/tools/website/rules.ts`, from crawl, PageSpeed, axe-core and DataForSEO data | Graded |
| AI-assisted | 12 | `src/tools/website/ai.ts`: the model grades against Jay's calibration notes, and every grade must quote text that exists on the site or it's dropped | Graded, labeled "AI-assisted" |
| Human judgment | 8 | Design, brand, photos, image placement, benefits, video, picture of success, identity | Locked, not scored |

Scores follow the skill's rubric (A 100, B 80, C 65, D 35, F 0), computed only from graded items. Locked and not-graded items never count.

Search rank is matched on the school's **website domain** from the intake form, never the requester's email domain. When DataForSEO returns a degraded result (every domain is google.com), the engine reruns once and matches on breadcrumb URLs, which is what caught Oakwood at #1.

## Flow

```
Intake form (/) → /api/request → Convex assessments.request (rate limit, 30-day reuse per domain)
  → Convex dispatch → Vercel /api/run (headless Chromium, 300s)
      collect: browser + PageSpeed API + DataForSEO, in parallel
      grade:   rules + AI with evidence check
      build:   report JSON → Convex
      deliver: GHL upsert (+ optional opportunity), Resend email (EMAIL_MODE off/test/live)
Status page (/status/<token>) polls → report at /r/<token>
```

## Layout

```
src/engine/            contract.ts (report JSON), scoring.ts
src/tools/website/     items.ts (53 items, tiers), rules.ts, ai.ts, build.ts
src/tools/website/collect/  extract.browser.js, checks.browser.js (run in the page),
                       browser.ts (Chromium), pagespeed.ts, dataforseo.ts, serp.ts
src/tools/marketing/   definition.ts (DRAFT questions)
src/render/            template.html (built from New Hope by scripts/build-template.cjs), render.ts
src/delivery/          email.ts, ghl.ts
convex/                schema.ts, assessments.ts
app/                   intake, status page, /r/<token>, API routes
fixtures/              ocaeagles.* (real Oakwood data, Nov 16 2026)
```

## Test without the network

```
npm run test:oakwood                      # rebuild Oakwood's report from the fixture → out/
npx tsx scripts/test-validator.ts         # evidence check rejects made-up quotes
npx tsx scripts/run-fixture.ts fixtures/ocaeagles.collected.json --live-ai   # real model call (needs ANTHROPIC_API_KEY)
```

## Setup

1. `npx convex dev` (creates the deployment and `convex/_generated`), then `npx convex env set APP_URL ...` and `WORKER_SECRET ...`.
2. Copy `.env.example` into Vercel's environment variables. Keep `EMAIL_MODE=off` or `test` until the email copy is approved.
3. Vercel Pro is needed for the 300-second function the worker uses.
