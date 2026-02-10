import type { CaseStage } from "@/shared/types";

export function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function getTimelineDate(
  timeline: { event: string; dates: number[] }[] | null,
  event: string,
): string | null {
  if (!timeline) return null;
  const entry = timeline.find((t) => t.event === event);
  if (!entry || !entry.dates || entry.dates.length === 0) return null;
  return formatTimestamp(entry.dates[0]);
}

export function getCaseStage(
  timeline: { event: string; dates: number[] }[] | null,
  isDecided: boolean,
): CaseStage {
  if (isDecided || timeline?.some((t) => t.event === "Decided")) return "decided";
  if (timeline?.some((t) => t.event === "Argued" || t.event === "Reargued")) return "argued";
  return "granted";
}

/**
 * Determine the current SCOTUS term.
 * Terms start in October: if we're in Oct-Dec, the term is the current year.
 * If Jan-Sep, the term is the previous year.
 */
export function getCurrentTerm(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (0 = Jan)
  const year = now.getFullYear();
  return month >= 9 ? year.toString() : (year - 1).toString();
}
