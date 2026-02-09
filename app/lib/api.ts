import { CaseSummary, OyezCase, OyezCaseListItem } from "./types";
import pool from "./db";

const OYEZ_BASE = "https://api.oyez.org";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  if (!timeline || !Array.isArray(timeline)) return { formatted: null, timestamp: null };
  const decided = timeline.find((t) => t && t.event === "Decided");
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

// ---------------------------------------------------------------------------
// Fallback: parse vote split from conclusion text when decisions is null
// ---------------------------------------------------------------------------

function parseVotesFromConclusion(
  conclusion: string | null
): { majority: number; minority: number } | null {
  if (!conclusion) return null;
  const text = conclusion.replace(/<[^>]+>/g, "");
  const splitMatch = text.match(/(\d+)[\u2013-](\d+)\s+majority/);
  if (splitMatch) {
    return {
      majority: parseInt(splitMatch[1], 10),
      minority: parseInt(splitMatch[2], 10),
    };
  }
  if (/\bunanimous(?:ly)?\b/i.test(text)) {
    return { majority: 9, minority: 0 };
  }
  return null;
}

function isDecidedFromTimeline(
  timeline: { event: string; dates: number[] }[] | null
): boolean {
  return timeline?.some((t) => t.event === "Decided") ?? false;
}

// ---------------------------------------------------------------------------
// DB row → CaseSummary
// ---------------------------------------------------------------------------

interface CaseRow {
  term: string;
  docket_number: string;
  name: string;
  first_party: string | null;
  second_party: string | null;
  description: string | null;
  facts_of_the_case: string | null;
  question: string | null;
  conclusion: string | null;
  decision_date: string | null;
  citation: unknown;
  justia_url: string | null;
  href: string;
  decisions: unknown;
  advocates: unknown;
  timeline: { event: string; dates: number[] }[];
  is_decided: boolean;
}

function rowToCaseSummary(row: CaseRow): CaseSummary {
  const { formatted, timestamp } = getDecisionDate(row.timeline);
  const { first, second } = parseName(row.name);

  const decisions = row.decisions as { majority_vote?: number; minority_vote?: number; decision_type?: string }[];
  const dec = decisions?.[0];

  let majorityVotes = dec?.majority_vote ?? 0;
  let minorityVotes = dec?.minority_vote ?? 0;

  // Fallback: parse vote split from conclusion when decisions is null/empty
  if (majorityVotes === 0 && minorityVotes === 0) {
    const parsed = parseVotesFromConclusion(row.conclusion);
    if (parsed) {
      majorityVotes = parsed.majority;
      minorityVotes = parsed.minority;
    }
  }

  const isDecided = row.is_decided || isDecidedFromTimeline(row.timeline);

  return {
    id: `${row.term}-${row.docket_number}`,
    name: row.name || "Unknown Case",
    firstParty: row.first_party || first,
    secondParty: row.second_party || second,
    docketNumber: row.docket_number,
    term: row.term,
    decisionDate: formatted,
    decisionTimestamp: timestamp,
    majorityVotes,
    minorityVotes,
    isDecided,
    decisionType: dec?.decision_type ?? "",
    description: row.description || "",
    href: row.href,
  };
}

function rowToOyezCase(row: CaseRow): OyezCase {
  return {
    ID: 0,
    name: row.name,
    citation: row.citation as OyezCase["citation"],
    term: row.term,
    first_party: row.first_party || "",
    second_party: row.second_party || "",
    docket_number: row.docket_number,
    decision_date: row.decision_date || "",
    description: row.description || "",
    justia_url: row.justia_url || "",
    href: row.href,
    facts_of_the_case: row.facts_of_the_case || "",
    question: row.question || "",
    conclusion: row.conclusion || "",
    advocates: row.advocates as OyezCase["advocates"],
    decisions: row.decisions as OyezCase["decisions"],
    timeline: row.timeline as OyezCase["timeline"],
  };
}

// ---------------------------------------------------------------------------
// Upsert a single case detail into the DB
// ---------------------------------------------------------------------------

async function upsertCase(detail: OyezCase): Promise<void> {
  const decided =
    detail.decisions?.[0]?.majority_vote !== undefined &&
    detail.decisions?.[0]?.minority_vote !== undefined;

  await pool.query(
    `INSERT INTO cases (
      term, docket_number, name, first_party, second_party,
      description, facts_of_the_case, question, conclusion,
      decision_date, citation, justia_url, href,
      decisions, advocates, timeline, is_decided, fetched_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
    ON CONFLICT (term, docket_number) DO UPDATE SET
      name = EXCLUDED.name,
      first_party = EXCLUDED.first_party,
      second_party = EXCLUDED.second_party,
      description = EXCLUDED.description,
      facts_of_the_case = EXCLUDED.facts_of_the_case,
      question = EXCLUDED.question,
      conclusion = EXCLUDED.conclusion,
      decision_date = EXCLUDED.decision_date,
      citation = EXCLUDED.citation,
      justia_url = EXCLUDED.justia_url,
      href = EXCLUDED.href,
      decisions = EXCLUDED.decisions,
      advocates = EXCLUDED.advocates,
      timeline = EXCLUDED.timeline,
      is_decided = EXCLUDED.is_decided,
      fetched_at = NOW()`,
    [
      detail.term,
      detail.docket_number,
      detail.name,
      detail.first_party || null,
      detail.second_party || null,
      detail.description || null,
      detail.facts_of_the_case || null,
      detail.question || null,
      detail.conclusion || null,
      detail.decision_date || null,
      JSON.stringify(detail.citation || null),
      detail.justia_url || null,
      detail.href,
      JSON.stringify(detail.decisions || []),
      JSON.stringify(detail.advocates || []),
      JSON.stringify(detail.timeline || []),
      decided,
    ]
  );
}

// ---------------------------------------------------------------------------
// Public API functions — DB-first, API fallback
// ---------------------------------------------------------------------------

export async function fetchRecentCases(
  term: string = "2023"
): Promise<CaseSummary[]> {
  // Try DB first
  const { rows } = await pool.query<CaseRow>(
    `SELECT * FROM cases WHERE term = $1 ORDER BY
      CASE WHEN is_decided THEN 0 ELSE 1 END,
      (timeline->0->'dates'->>0)::bigint DESC NULLS LAST`,
    [term]
  );

  if (rows.length > 0) {
    return rows.map(rowToCaseSummary);
  }

  // Fallback: fetch from Oyez API and cache
  const res = await fetch(`${OYEZ_BASE}/cases?per_page=0&filter=term:${term}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch cases: ${res.status}`);
  }

  const data: OyezCaseListItem[] = await res.json();

  const cases = data.map((raw): CaseSummary => {
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
      isDecided: !!formatted,
      decisionType: "",
      description: raw.description || "",
      href: raw.href || "",
    };
  });

  cases.sort((a, b) => {
    if (a.decisionTimestamp && b.decisionTimestamp)
      return b.decisionTimestamp - a.decisionTimestamp;
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
  // Try DB first
  const { rows } = await pool.query<CaseRow>(
    `SELECT * FROM cases WHERE term = $1 AND docket_number = $2`,
    [term, docket]
  );

  if (rows.length > 0) {
    const row = rows[0];
    // If decided, serve from DB — immutable
    if (row.is_decided) {
      return rowToOyezCase(row);
    }
    // Undecided: re-fetch to check for updates
  }

  // Fetch from API
  const res = await fetch(`${OYEZ_BASE}/cases/${term}/${docket}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) return rows.length > 0 ? rowToOyezCase(rows[0]) : null;

  const data: OyezCase = await res.json();

  // Cache in DB
  try {
    await upsertCase(data);
  } catch (err) {
    console.error("Failed to cache case detail:", err);
  }

  return data;
}

export interface VoteSplitStats {
  label: string;
  count: number;
}

export async function fetchTermStats(
  term: string
): Promise<{ splits: VoteSplitStats[]; totalCases: number }> {
  // Try DB first — single query instead of N+1 API calls
  // Include cases that are timeline-decided but missing structured decisions data
  const { rows } = await pool.query<{
    decisions: { majority_vote?: number; minority_vote?: number }[];
    conclusion: string | null;
    timeline: { event: string; dates: number[] }[];
    is_decided: boolean;
  }>(
    `SELECT decisions, conclusion, timeline, is_decided FROM cases WHERE term = $1`,
    [term]
  );

  if (rows.length > 0) {
    const splitCounts: Record<string, number> = {
      Unanimous: 0,
      "8-1": 0,
      "7-2": 0,
      "6-3": 0,
      "5-4": 0,
    };
    let decidedCount = 0;

    for (const row of rows) {
      const dec = row.decisions?.[0];
      let maj = dec?.majority_vote;
      let min = dec?.minority_vote;

      // Fallback: parse vote split from conclusion when decisions is null/empty
      if (maj === undefined || min === undefined) {
        if (!row.is_decided && !isDecidedFromTimeline(row.timeline)) continue;
        const parsed = parseVotesFromConclusion(row.conclusion);
        if (!parsed) continue;
        maj = parsed.majority;
        min = parsed.minority;
      }

      decidedCount++;
      if (min === 0) {
        splitCounts["Unanimous"]++;
      } else {
        const key = `${maj}-${min}`;
        if (key in splitCounts) splitCounts[key]++;
      }
    }

    const splits: VoteSplitStats[] = Object.entries(splitCounts).map(
      ([label, count]) => ({ label, count })
    );
    return { splits, totalCases: decidedCount };
  }

  // Fallback: fetch from API (original N+1 approach)
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
  for (let y = currentYear; y >= 2015; y--) {
    terms.push(y.toString());
  }
  return terms;
}
