import { Pool } from "pg";

const OYEZ_BASE = "https://api.oyez.org";

interface OyezCaseListItem {
  ID: number;
  name: string;
  term: string;
  docket_number: string;
  description: string;
  href: string;
  timeline: { event: string; dates: number[] }[];
}

interface OyezCase {
  ID: number;
  name: string;
  citation: { volume: string; page: string | null; year: string };
  term: string;
  first_party: string;
  second_party: string;
  docket_number: string;
  decision_date: string;
  description: string;
  justia_url: string;
  href: string;
  facts_of_the_case: string;
  question: string;
  conclusion: string;
  advocates: unknown[];
  decisions: { majority_vote?: number; minority_vote?: number }[];
  written_opinion: unknown[];
  timeline: { event: string; dates: number[] }[];
}

/**
 * Determine the current SCOTUS term.
 * Terms start in October: if we're in Oct-Dec, the term is the current year.
 * If Jan-Sep, the term is the previous year.
 */
function getCurrentTerm(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (0 = Jan)
  const year = now.getFullYear();
  return month >= 9 ? year.toString() : (year - 1).toString();
}

function isDecided(detail: OyezCase): boolean {
  const dec = detail.decisions?.[0];
  if (!dec) return false;
  return dec.majority_vote !== undefined && dec.minority_vote !== undefined;
}

async function updateTerm(pool: Pool, term: string): Promise<{ inserted: number; updated: number; skipped: number }> {
  console.log(`[${term}] Fetching case list from Oyez API...`);

  const listRes = await fetch(`${OYEZ_BASE}/cases?per_page=0&filter=term:${term}`);
  if (!listRes.ok) {
    console.error(`[${term}] Failed to fetch case list: ${listRes.status}`);
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  const cases = (await listRes.json()) as OyezCaseListItem[];
  console.log(`[${term}] Found ${cases.length} cases on Oyez`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of cases) {
    // Check if already in DB and decided — skip if so (immutable)
    const existing = await pool.query(
      `SELECT is_decided FROM cases WHERE term = $1 AND docket_number = $2`,
      [term, c.docket_number]
    );

    if (existing.rows.length > 0 && existing.rows[0].is_decided) {
      skipped++;
      continue;
    }

    // Fetch full case detail from API
    let detail: OyezCase;
    try {
      const detailRes = await fetch(c.href);
      if (!detailRes.ok) {
        console.warn(`[${term}] Skipping ${c.docket_number} — detail fetch failed (${detailRes.status})`);
        continue;
      }
      detail = (await detailRes.json()) as OyezCase;
    } catch (err) {
      console.warn(`[${term}] Skipping ${c.docket_number} — fetch error:`, err);
      continue;
    }

    const decided = isDecided(detail);

    await pool.query(
      `INSERT INTO cases (
        term, docket_number, name, first_party, second_party,
        description, facts_of_the_case, question, conclusion,
        decision_date, citation, justia_url, href,
        decisions, advocates, written_opinion, timeline, is_decided, fetched_at, search_vector
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),
        setweight(to_tsvector('english', coalesce($3, '')), 'A') ||
        setweight(to_tsvector('english', coalesce($4, '')), 'A') ||
        setweight(to_tsvector('english', coalesce($5, '')), 'A') ||
        setweight(to_tsvector('english', coalesce($6, '')), 'B') ||
        setweight(to_tsvector('english', coalesce($8, '')), 'B') ||
        setweight(to_tsvector('english', coalesce($7, '')), 'C') ||
        setweight(to_tsvector('english', coalesce($9, '')), 'C')
      )
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
        written_opinion = EXCLUDED.written_opinion,
        timeline = EXCLUDED.timeline,
        is_decided = EXCLUDED.is_decided,
        fetched_at = NOW(),
        search_vector = EXCLUDED.search_vector`,
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
        JSON.stringify(detail.written_opinion || []),
        JSON.stringify(detail.timeline || []),
        decided,
      ]
    );

    if (existing.rows.length > 0) {
      updated++;
    } else {
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

async function main() {
  const startTime = Date.now();
  console.log(`=== SCOTUS Cron Job Started at ${new Date().toISOString()} ===\n`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const currentTerm = getCurrentTerm();
  // Also check previous term in case of late decisions (e.g., summer opinions)
  const previousTerm = (parseInt(currentTerm) - 1).toString();

  console.log(`Current term: ${currentTerm}, Previous term: ${previousTerm}\n`);

  // Update previous term first (fewer updates expected)
  const prevResult = await updateTerm(pool, previousTerm);
  console.log(`[${previousTerm}] Done — inserted: ${prevResult.inserted}, updated: ${prevResult.updated}, skipped: ${prevResult.skipped}\n`);

  // Update current term
  const currResult = await updateTerm(pool, currentTerm);
  console.log(`[${currentTerm}] Done — inserted: ${currResult.inserted}, updated: ${currResult.updated}, skipped: ${currResult.skipped}\n`);

  // Summary
  const totalInserted = prevResult.inserted + currResult.inserted;
  const totalUpdated = prevResult.updated + currResult.updated;
  const totalSkipped = prevResult.skipped + currResult.skipped;
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`=== Cron Job Complete ===`);
  console.log(`Total: ${totalInserted} new, ${totalUpdated} updated, ${totalSkipped} skipped (decided)`);
  console.log(`Duration: ${duration}s`);

  await pool.end();
}

main().catch((err) => {
  console.error("Cron job failed:", err);
  process.exit(1);
});
