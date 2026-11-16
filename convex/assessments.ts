import { v } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const DAY = 86_400_000;
const REUSE_DAYS = 30; // reuse a domain's collected data for this long
const IP_LIMIT = 3; // free requests per IP per day

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Intake form submits here. Returns the status-page token. */
export const request = mutation({
  args: {
    tool: v.union(v.literal("website-report-card"), v.literal("marketing-assessment")),
    contact: v.object({
      name: v.string(), email: v.string(), phone: v.optional(v.string()), role: v.optional(v.string()),
      org: v.string(), websiteManager: v.optional(v.string()), schoolSize: v.optional(v.string()),
    }),
    input: v.any(),
    domain: v.optional(v.string()),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.contact.email)) throw new Error("Please enter a valid email address.");
    const now = Date.now();
    if (a.ip) {
      const recent = await ctx.db.query("assessments").withIndex("by_ip", (q) => q.eq("ip", a.ip).gt("createdAt", now - DAY)).collect();
      if (recent.length >= IP_LIMIT) throw new Error("You've requested several reports today. Please try again tomorrow, or email jay@banner61.com.");
    }
    // Reuse collected data for the same school within 30 days.
    let reuse = null;
    if (a.domain) {
      reuse = await ctx.db
        .query("assessments")
        .withIndex("by_domain", (q) => q.eq("tool", a.tool).eq("domain", a.domain).gt("createdAt", now - REUSE_DAYS * DAY))
        .filter((q) => q.eq(q.field("status"), "ready"))
        .order("desc")
        .first();
    }
    const t = token();
    const id = await ctx.db.insert("assessments", {
      tool: a.tool, tier: "free", status: "queued", step: "Getting started", token: t,
      contact: a.contact, input: a.input, domain: a.domain, ip: a.ip, createdAt: now,
      ...(reuse ? { collected: reuse.collected, coverStorageId: reuse.coverStorageId, ai: reuse.ai } : {}),
    });
    await ctx.scheduler.runAfter(0, internal.assessments.dispatch, { id });
    return t;
  },
});

/** Hands the job to the Vercel worker, which has the headless browser. */
export const dispatch = internalAction({
  args: { id: v.id("assessments") },
  handler: async (_ctx, { id }) => {
    const res = await fetch(`${process.env.APP_URL}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WORKER_SECRET}` },
      body: JSON.stringify({ id }),
    });
    if (!res.ok && res.status !== 202) throw new Error(`Worker refused job: ${res.status}`);
  },
});

/** Status page: live progress, then the report link. */
export const status = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a = await ctx.db.query("assessments").withIndex("by_token", (q) => q.eq("token", token)).first();
    if (!a) return null;
    return { status: a.status, step: a.step, school: a.contact.org, tool: a.tool, overall: a.overall ?? null, error: a.status === "failed" ? "We couldn't finish this report." : null };
  },
});

/** Report page: everything needed to render. */
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a = await ctx.db.query("assessments").withIndex("by_token", (q) => q.eq("token", token)).first();
    if (!a || a.status !== "ready") return null;
    const cover = a.coverStorageId ? await ctx.storage.getUrl(a.coverStorageId) : null;
    return { report: a.report, cover };
  },
});

// ----- Worker-facing functions. Public, but every call must carry WORKER_SECRET. -----

const secret = v.string();
function assertWorker(s: string) {
  if (!process.env.WORKER_SECRET || s !== process.env.WORKER_SECRET) throw new Error("Not authorized");
}

export const get = query({ args: { secret, id: v.id("assessments") }, handler: async (ctx, a) => (assertWorker(a.secret), ctx.db.get(a.id)) });

export const progress = mutation({
  args: { secret, id: v.id("assessments"), status: v.optional(v.union(v.literal("collecting"), v.literal("grading"))), step: v.string() },
  handler: async (ctx, a) => (assertWorker(a.secret), ctx.db.patch(a.id, { step: a.step, ...(a.status ? { status: a.status } : {}) })),
});

export const saveCollected = mutation({
  args: { secret, id: v.id("assessments"), collected: v.any(), coverStorageId: v.optional(v.id("_storage")), warnings: v.array(v.string()) },
  handler: async (ctx, a) => (assertWorker(a.secret), ctx.db.patch(a.id, { collected: a.collected, coverStorageId: a.coverStorageId, warnings: a.warnings, status: "grading" })),
});

export const finish = mutation({
  args: { secret, id: v.id("assessments"), report: v.any(), ai: v.any(), overall: v.optional(v.number()) },
  handler: async (ctx, a) => (assertWorker(a.secret), ctx.db.patch(a.id, { report: a.report, ai: a.ai, overall: a.overall, status: "ready", step: "Done" })),
});

export const fail = mutation({
  args: { secret, id: v.id("assessments"), error: v.string() },
  handler: async (ctx, a) => (assertWorker(a.secret), ctx.db.patch(a.id, { status: "failed", error: a.error, step: "Something went wrong" })),
});

export const delivered = mutation({
  args: { secret, id: v.id("assessments"), ghlContactId: v.optional(v.string()), emailedAt: v.optional(v.number()) },
  handler: async (ctx, a) => (assertWorker(a.secret), ctx.db.patch(a.id, { ...(a.ghlContactId ? { ghlContactId: a.ghlContactId } : {}), ...(a.emailedAt ? { emailedAt: a.emailedAt } : {}) })),
});

export const uploadUrl = mutation({ args: { secret }, handler: async (ctx, a) => (assertWorker(a.secret), ctx.storage.generateUploadUrl()) });
