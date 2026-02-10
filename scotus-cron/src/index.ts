import { Pool } from "pg";

const OYEZ_BASE = "https://api.oyez.org";

// ---------------------------------------------------------------------------
// Local types — mirrors shared/types.ts
// Duplicated here because Railway deploys scotus-cron/ as an isolated Docker
// context without access to ../shared/. Keep in sync with shared/types.ts.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Local upsert — mirrors shared/upsert.ts
// Duplicated for the same Railway Docker context reason as above.
// ---------------------------------------------------------------------------

async function upsertCase(pool: Pool, detail: OyezCase): Promise<void> {
  const decided =
    detail.decisions?.[0]?.majority_vote !== undefined &&
    detail.decisions?.[0]?.minority_vote !== undefined;

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

    await upsertCase(pool, detail);

    if (existing.rows.length > 0) {
      updated++;
    } else {
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

// ---------------------------------------------------------------------------
// Justice sync — fetch missing justice profiles from Oyez API
// Duplicated here for the same Railway Docker context reason as types/upsert.
// ---------------------------------------------------------------------------

interface OyezJusticeResponse {
  name: string;
  last_name: string;
  identifier: string;
  home_state: string | null;
  law_school: string | null;
  roles: {
    role_title: string;
    appointing_president: string;
    date_start: number;
    date_end: number;
  }[];
  thumbnail: { href: string } | null;
}

async function syncJustices(pool: Pool, terms: string[]): Promise<number> {
  console.log(`\n--- Syncing justices ---`);

  // Get justice hrefs from case votes for the given terms
  const placeholders = terms.map((_, i) => `$${i + 1}`).join(",");
  const { rows } = await pool.query<{ decisions: unknown }>(
    `SELECT DISTINCT decisions FROM cases
     WHERE term IN (${placeholders}) AND decisions IS NOT NULL AND decisions != '[]'::jsonb`,
    terms
  );

  const justiceHrefs = new Set<string>();
  for (const row of rows) {
    const decs = row.decisions as { votes?: { member?: { href?: string } }[] }[];
    if (!Array.isArray(decs)) continue;
    for (const dec of decs) {
      if (!Array.isArray(dec.votes)) continue;
      for (const v of dec.votes) {
        if (v.member?.href) justiceHrefs.add(v.member.href);
      }
    }
  }

  // Check which justices we already have
  const { rows: existing } = await pool.query<{ identifier: string }>(
    `SELECT identifier FROM justices`
  );
  const existingIds = new Set(existing.map((r) => r.identifier));

  let fetched = 0;
  for (const href of justiceHrefs) {
    const identifier = href.split("/people/")[1];
    if (!identifier || existingIds.has(identifier)) continue;

    try {
      const res = await fetch(href);
      if (!res.ok) continue;
      const data = (await res.json()) as OyezJusticeResponse;

      const scotusRole = data.roles?.find((r) =>
        r.role_title?.includes("Justice") || r.role_title?.includes("Chief Justice")
      );

      await pool.query(
        `INSERT INTO justices (identifier, name, last_name, role_title, appointing_president,
          date_start, date_end, home_state, law_school, thumbnail_url, fetched_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (identifier) DO NOTHING`,
        [
          identifier,
          data.name || identifier,
          data.last_name || identifier,
          scotusRole?.role_title || null,
          scotusRole?.appointing_president || null,
          scotusRole?.date_start || null,
          scotusRole?.date_end ?? 0,
          data.home_state || null,
          data.law_school || null,
          data.thumbnail?.href || null,
        ]
      );
      fetched++;
    } catch {
      // skip silently
    }
  }

  console.log(`Justices: ${fetched} new, ${justiceHrefs.size - fetched} already existed`);
  return fetched;
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

  // Sync justices from vote data (lightweight — only fetches new justices)
  await syncJustices(pool, [currentTerm, previousTerm]);

  // Summary
  const totalInserted = prevResult.inserted + currResult.inserted;
  const totalUpdated = prevResult.updated + currResult.updated;
  const totalSkipped = prevResult.skipped + currResult.skipped;
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n=== Cron Job Complete ===`);
  console.log(`Total: ${totalInserted} new, ${totalUpdated} updated, ${totalSkipped} skipped (decided)`);
  console.log(`Duration: ${duration}s`);

  await pool.end();
}

main().catch((err) => {
  console.error("Cron job failed:", err);
  process.exit(1);
});
