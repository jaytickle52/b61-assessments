import type { Category, Grade, ReportData } from "./contract";

// Rubric from the B61-Website Report Card skill: A=100, B=80, C=65, D=35, F=0.
export const POINTS: Record<Grade, number> = { A: 100, B: 80, C: 65, D: 35, F: 0 };

const roundHalfUp = (n: number) => Math.floor(n + 0.5);

/** Items that count toward a score: graded, not locked, not unassessed. */
export function scoredItems(c: Category) {
  return c.items.filter((it) => it.g && !it.locked && !it.unassessed);
}

/** Category score, or null when nothing in it is graded (e.g. a fully locked category). */
export function categoryScore(c: Category): number | null {
  const items = scoredItems(c);
  if (!items.length) return null;
  return roundHalfUp(items.reduce((a, it) => a + POINTS[it.g!], 0) / items.length);
}

/** Overall score: average of the category scores that exist. */
export function overallScore(r: ReportData): number | null {
  const scores = r.categories.map(categoryScore).filter((s): s is number => s !== null);
  if (!scores.length) return null;
  return roundHalfUp(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function summarize(r: ReportData) {
  return {
    overall: overallScore(r),
    categories: r.categories.map((c) => ({
      id: c.id,
      name: c.name,
      score: categoryScore(c),
      graded: scoredItems(c).length,
      locked: c.items.filter((i) => i.locked).length,
      unassessed: c.items.filter((i) => i.unassessed).length,
      total: c.items.length,
    })),
  };
}
