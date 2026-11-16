import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// One table for every assessment tool. The website tool stores collected data so a second
// request for the same domain within 30 days reuses it (re-rendered for the new contact)
// instead of crawling the school again.

export default defineSchema({
  assessments: defineTable({
    tool: v.union(v.literal("website-report-card"), v.literal("marketing-assessment")),
    tier: v.union(v.literal("free"), v.literal("paid")),
    status: v.union(v.literal("queued"), v.literal("collecting"), v.literal("grading"), v.literal("ready"), v.literal("failed")),
    step: v.optional(v.string()), // human-readable progress line for the status page
    token: v.string(), // unguessable id used in the report URL
    contact: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      role: v.optional(v.string()),
      org: v.string(),
      websiteManager: v.optional(v.string()), // qualifier: internal staff, outside agency, volunteer, no one
      schoolSize: v.optional(v.string()),
    }),
    input: v.any(), // tool input: CollectInput for website, answers for marketing
    domain: v.optional(v.string()),
    collected: v.optional(v.any()), // CollectedData (website)
    coverStorageId: v.optional(v.id("_storage")),
    ai: v.optional(v.any()), // validated AI output and dropped items, kept for audit
    report: v.optional(v.any()), // ReportData
    overall: v.optional(v.number()),
    warnings: v.optional(v.array(v.string())),
    error: v.optional(v.string()),
    ip: v.optional(v.string()),
    ghlContactId: v.optional(v.string()),
    emailedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_domain", ["tool", "domain", "createdAt"])
    .index("by_ip", ["ip", "createdAt"])
    .index("by_created", ["createdAt"]),
});
