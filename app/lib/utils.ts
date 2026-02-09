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
