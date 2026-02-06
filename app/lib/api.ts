import { CaseSummary, OyezCase, OyezCaseListItem } from "./types";

const OYEZ_BASE = "https://api.oyez.org";

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDecisionDate(timeline: OyezCaseListItem["timeline"]): {
  formatted: string | null;
  timestamp: number | null;
} {
  if (!timeline) return { formatted: null, timestamp: null };
  const decided = timeline.find((t) => t.event === "Decided");
  if (decided && decided.dates && decided.dates.length > 0) {
    const ts = decided.dates[0];
    return { formatted: formatTimestamp(ts), timestamp: ts };
  }
  return { formatted: null, timestamp: null };
}

function parseName(name: string): { first: string; second: string } {
  const parts = name.split(" v. ");
  if (parts.length === 2) {
    return { first: parts[0].trim(), second: parts[1].trim() };
  }
  return { first: name, second: "" };
}

function parseCaseSummary(raw: OyezCaseListItem): CaseSummary {
  const { formatted, timestamp } = getDecisionDate(raw.timeline);
  const { first, second } = parseName(raw.name);

  return {
    id: `${raw.term}-${raw.docket_number}`,
    name: raw.name || "Unknown Case",
    firstParty: first,
    secondParty: second,
    docketNumber: raw.docket_number || "",
    term: raw.term || "",
    decisionDate: formatted,
    decisionTimestamp: timestamp,
    majorityVotes: 0,
    minorityVotes: 0,
    decisionType: "",
    description: raw.description || "",
    href: raw.href || "",
  };
}

export async function fetchRecentCases(
  term: string = "2023"
): Promise<CaseSummary[]> {
  const res = await fetch(`${OYEZ_BASE}/cases?per_page=0&filter=term:${term}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch cases: ${res.status}`);
  }

  const data: OyezCaseListItem[] = await res.json();

  const cases = data
    .map(parseCaseSummary)
    .sort((a, b) => {
      if (a.decisionTimestamp && b.decisionTimestamp) {
        return b.decisionTimestamp - a.decisionTimestamp;
      }
      if (a.decisionTimestamp) return -1;
      if (b.decisionTimestamp) return 1;
      return 0;
    });

  return cases;
}

export async function fetchCaseDetail(
  term: string,
  docket: string
): Promise<OyezCase | null> {
  const res = await fetch(`${OYEZ_BASE}/cases/${term}/${docket}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const data: OyezCase = await res.json();
  return data;
}

export interface VoteSplitStats {
  label: string;
  count: number;
}

export async function fetchTermStats(
  term: string
): Promise<{ splits: VoteSplitStats[]; totalCases: number }> {
  const listRes = await fetch(
    `${OYEZ_BASE}/cases?per_page=0&filter=term:${term}`,
    { next: { revalidate: 3600 } }
  );

  if (!listRes.ok) {
    throw new Error(`Failed to fetch cases: ${listRes.status}`);
  }

  const listData: OyezCaseListItem[] = await listRes.json();

  const detailPromises = listData.map((c) =>
    fetch(c.href, { next: { revalidate: 3600 } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  );

  const details: (OyezCase | null)[] = await Promise.all(detailPromises);

  const splitCounts: Record<string, number> = {
    Unanimous: 0,
    "8-1": 0,
    "7-2": 0,
    "6-3": 0,
    "5-4": 0,
  };

  let decidedCount = 0;

  for (const detail of details) {
    if (!detail?.decisions?.[0]) continue;
    const d = detail.decisions[0];
    const maj = d.majority_vote;
    const min = d.minority_vote;
    if (maj === undefined || min === undefined) continue;

    decidedCount++;

    if (min === 0) {
      splitCounts["Unanimous"]++;
    } else {
      const key = `${maj}-${min}`;
      if (key in splitCounts) {
        splitCounts[key]++;
      }
    }
  }

  const splits: VoteSplitStats[] = Object.entries(splitCounts).map(
    ([label, count]) => ({ label, count })
  );

  return { splits, totalCases: decidedCount };
}

export async function fetchAvailableTerms(): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const terms: string[] = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    terms.push(y.toString());
  }
  return terms;
}
