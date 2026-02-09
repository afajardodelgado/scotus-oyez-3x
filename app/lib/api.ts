import { CaseSummary, OyezCase, OyezCaseListItem } from "./types";
import { formatTimestamp, getCurrentTerm } from "./utils";
import { upsertCase } from "@/shared/upsert";
import pool from "./db";

const OYEZ_BASE = "https://api.oyez.org";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  // Match "6-3 majority", "5-4 opinion", "6–3 majority" etc.
  const splitMatch = text.match(/(\d+)[\u2013-](\d+)\s+(?:majority|opinion)/);
  if (splitMatch) {
    return {
      majority: parseInt(splitMatch[1], 10),
      minority: parseInt(splitMatch[2], 10),
    };
  }
  if (/\bunanimous(?:ly)?\b/i.test(text)) {
    return { majority: 9, minority: 0 };
  }
  if (/\bequally divided\b/i.test(text)) {
    return { majority: 4, minority: 4 };
  }
  // "authored the majority opinion" with no vote count — can't determine split
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
  written_opinion: unknown;
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
    written_opinion: row.written_opinion as OyezCase["written_opinion"],
    timeline: row.timeline as OyezCase["timeline"],
  };
}

// ---------------------------------------------------------------------------
// Public API functions — DB-first, API fallback
// ---------------------------------------------------------------------------

export async function fetchRecentCases(
  term: string = getCurrentTerm()
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
    await upsertCase(pool, data);
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
    const splitCounts: Record<string, number> = {};
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
      const key = min === 0 ? "Unanimous" : `${maj}-${min}`;
      splitCounts[key] = (splitCounts[key] || 0) + 1;
    }

    // Sort: Unanimous first, then by minority vote ascending (tightest splits last)
    const splits: VoteSplitStats[] = Object.entries(splitCounts)
      .sort(([a], [b]) => {
        if (a === "Unanimous") return -1;
        if (b === "Unanimous") return 1;
        const aMin = parseInt(a.split("-")[1]) || 0;
        const bMin = parseInt(b.split("-")[1]) || 0;
        return aMin - bMin;
      })
      .map(([label, count]) => ({ label, count }));
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

  const splitCounts: Record<string, number> = {};
  let decidedCount = 0;

  for (const detail of details) {
    if (!detail?.decisions?.[0]) continue;
    const d = detail.decisions[0];
    const maj = d.majority_vote;
    const min = d.minority_vote;
    if (maj === undefined || min === undefined) continue;

    decidedCount++;
    const key = min === 0 ? "Unanimous" : `${maj}-${min}`;
    splitCounts[key] = (splitCounts[key] || 0) + 1;
  }

  const splits: VoteSplitStats[] = Object.entries(splitCounts)
    .sort(([a], [b]) => {
      if (a === "Unanimous") return -1;
      if (b === "Unanimous") return 1;
      const aMin = parseInt(a.split("-")[1]) || 0;
      const bMin = parseInt(b.split("-")[1]) || 0;
      return aMin - bMin;
    })
    .map(([label, count]) => ({ label, count }));

  return { splits, totalCases: decidedCount };
}

export async function searchCases(query: string): Promise<CaseSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Convert user query to tsquery — handle multi-word by joining with &
  const words = trimmed.split(/\s+/).filter(Boolean);
  const tsQuery = words.map((w) => w.replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean).join(" & ");

  if (!tsQuery) return [];

  // Primary: full-text search with ranking
  // Fallback: trigram similarity on case name for fuzzy/typo matches
  const { rows } = await pool.query<CaseRow>(
    `SELECT *, 
      ts_rank(search_vector, to_tsquery('english', $1)) AS fts_rank,
      similarity(name, $2) AS trgm_score
    FROM cases
    WHERE search_vector @@ to_tsquery('english', $1)
       OR similarity(name, $2) > 0.15
    ORDER BY
      ts_rank(search_vector, to_tsquery('english', $1)) DESC,
      similarity(name, $2) DESC
    LIMIT 50`,
    [tsQuery, trimmed]
  );

  return rows.map(rowToCaseSummary);
}

export interface JusticeAgreementCell {
  justice1: string;
  justice2: string;
  agreed: number;
  total: number;
  rate: number;
}

export interface JusticeAgreementData {
  justices: string[];
  matrix: Record<string, Record<string, JusticeAgreementCell>>;
  caseCount: number;
}

export async function fetchJusticeAgreement(
  term: string
): Promise<JusticeAgreementData> {
  const { rows: rawRows } = await pool.query<{
    decisions: {
      votes: { member: { last_name: string }; vote: string }[];
      majority_vote?: number;
      minority_vote?: number;
    }[] | null;
  }>(
    `SELECT decisions FROM cases WHERE term = $1`,
    [term]
  );

  // Filter in JS — PostgreSQL can reorder AND conditions so
  // jsonb_array_length may run before typeof guards, crashing on scalars
  const rows = rawRows.filter((r) => {
    const d = r.decisions;
    if (!Array.isArray(d) || d.length === 0) return false;
    const first = d[0];
    if (!first || !Array.isArray(first.votes) || first.votes.length === 0) return false;
    return true;
  });

  // Collect all justice votes per case, skip unanimous cases
  const caseVotes: { justiceVotes: Record<string, string> }[] = [];

  for (const row of rows) {
    const dec = row.decisions?.[0];
    if (!dec?.votes || dec.votes.length === 0) continue;
    // Skip unanimous cases — alignment is only interesting in divided cases
    const maj = dec.majority_vote ?? 0;
    const min = dec.minority_vote ?? 0;
    if (min === 0) continue;

    const justiceVotes: Record<string, string> = {};
    for (const v of dec.votes) {
      const name = v.member?.last_name;
      if (!name || !v.vote || v.vote === "none") continue;
      justiceVotes[name] = v.vote;
    }
    if (Object.keys(justiceVotes).length >= 2) {
      caseVotes.push({ justiceVotes });
    }
  }

  // Compute pairwise agreement
  const allJustices = new Set<string>();
  for (const cv of caseVotes) {
    for (const j of Object.keys(cv.justiceVotes)) {
      allJustices.add(j);
    }
  }

  const matrix: Record<string, Record<string, JusticeAgreementCell>> = {};
  const justiceList = Array.from(allJustices);

  for (const j1 of justiceList) {
    matrix[j1] = {};
    for (const j2 of justiceList) {
      matrix[j1][j2] = { justice1: j1, justice2: j2, agreed: 0, total: 0, rate: 0 };
    }
  }

  for (const cv of caseVotes) {
    const participating = Object.keys(cv.justiceVotes);
    for (let i = 0; i < participating.length; i++) {
      for (let j = i + 1; j < participating.length; j++) {
        const j1 = participating[i];
        const j2 = participating[j];
        const same = cv.justiceVotes[j1] === cv.justiceVotes[j2];
        matrix[j1][j2].total++;
        matrix[j2][j1].total++;
        if (same) {
          matrix[j1][j2].agreed++;
          matrix[j2][j1].agreed++;
        }
      }
    }
  }

  // Compute rates
  for (const j1 of justiceList) {
    for (const j2 of justiceList) {
      if (j1 === j2) {
        matrix[j1][j2].rate = 1;
      } else if (matrix[j1][j2].total > 0) {
        matrix[j1][j2].rate = matrix[j1][j2].agreed / matrix[j1][j2].total;
      }
    }
  }

  // Sort justices by average agreement (creates natural bloc clustering)
  justiceList.sort((a, b) => {
    const avgA =
      justiceList.reduce((sum, j) => sum + (j !== a ? matrix[a][j].rate : 0), 0) /
      (justiceList.length - 1);
    const avgB =
      justiceList.reduce((sum, j) => sum + (j !== b ? matrix[b][j].rate : 0), 0) /
      (justiceList.length - 1);
    return avgB - avgA;
  });

  return { justices: justiceList, matrix, caseCount: caseVotes.length };
}

export interface ConstitutionArticle {
  article: string;
  article_title: string;
  section_count: number;
}

export interface ConstitutionSection {
  id: number;
  article: string;
  article_title: string;
  section_number: number | null;
  section_title: string | null;
  text: string;
}

export async function fetchConstitutionArticles(): Promise<ConstitutionArticle[]> {
  const { rows } = await pool.query<ConstitutionArticle>(
    `SELECT article, article_title, COUNT(*)::int AS section_count
     FROM constitution_sections
     GROUP BY article, article_title
     ORDER BY MIN(sort_order)`
  );
  return rows;
}

export async function fetchConstitutionArticle(
  article: string
): Promise<ConstitutionSection[]> {
  const { rows } = await pool.query<ConstitutionSection>(
    `SELECT id, article, article_title, section_number, section_title, text
     FROM constitution_sections
     WHERE article = $1
     ORDER BY sort_order`,
    [article]
  );
  return rows;
}

export async function fetchAvailableTerms(): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const terms: string[] = [];
  for (let y = currentYear; y >= 2015; y--) {
    terms.push(y.toString());
  }
  return terms;
}
