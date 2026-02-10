import { Pool } from "pg";
import type { OyezCaseListItem, OyezCase } from "../shared/types";
import { upsertCase } from "../shared/upsert";

const OYEZ_BASE = "https://api.oyez.org";

// ---------------------------------------------------------------------------
// Case seeding
// ---------------------------------------------------------------------------

async function seedTerm(pool: Pool, term: string) {
  console.log(`\nFetching case list for term ${term}...`);

  const listRes = await fetch(
    `${OYEZ_BASE}/cases?per_page=0&filter=term:${term}`
  );
  if (!listRes.ok) {
    console.error(`Failed to fetch case list for term ${term}: ${listRes.status}`);
    return;
  }

  const cases: OyezCaseListItem[] = await listRes.json();
  console.log(`Found ${cases.length} cases for term ${term}`);

  let inserted = 0;
  let skipped = 0;

  for (const c of cases) {
    // Check if already exists and is decided
    const existing = await pool.query(
      `SELECT is_decided FROM cases WHERE term = $1 AND docket_number = $2`,
      [term, c.docket_number]
    );

    if (existing.rows.length > 0 && existing.rows[0].is_decided) {
      skipped++;
      continue;
    }

    // Fetch full case detail
    let detail: OyezCase;
    try {
      const detailRes = await fetch(c.href);
      if (!detailRes.ok) {
        console.warn(`  Skipping ${c.docket_number} — detail fetch failed`);
        continue;
      }
      detail = await detailRes.json();
    } catch {
      console.warn(`  Skipping ${c.docket_number} — fetch error`);
      continue;
    }

    await upsertCase(pool, detail);

    inserted++;
    process.stdout.write(`  ${inserted} inserted/updated\r`);
  }

  console.log(`  Term ${term}: ${inserted} inserted/updated, ${skipped} already decided (skipped)`);
}

// ---------------------------------------------------------------------------
// Justice syncing — extract identifiers from case votes, fetch profiles
// ---------------------------------------------------------------------------

interface OyezJusticeResponse {
  ID: number;
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

async function syncJustices(pool: Pool) {
  console.log("\n--- Syncing justices ---");

  // Extract unique justice href URLs from all case decisions
  const { rows } = await pool.query<{ decisions: unknown }>(`
    SELECT DISTINCT decisions FROM cases
    WHERE decisions IS NOT NULL AND decisions != '[]'::jsonb
  `);

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

  console.log(`Found ${justiceHrefs.size} unique justice hrefs in case data`);

  // Check which justices we already have
  const { rows: existing } = await pool.query<{ identifier: string }>(
    `SELECT identifier FROM justices`
  );
  const existingIds = new Set(existing.map((r) => r.identifier));

  let fetched = 0;
  let skipped = 0;

  for (const href of justiceHrefs) {
    // Extract identifier from href: https://api.oyez.org/people/john_g_roberts_jr → john_g_roberts_jr
    const identifier = href.split("/people/")[1];
    if (!identifier) continue;

    if (existingIds.has(identifier)) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(href);
      if (!res.ok) {
        console.warn(`  Skipping justice ${identifier} — fetch failed (${res.status})`);
        continue;
      }
      const data: OyezJusticeResponse = await res.json();

      // Find SCOTUS role
      const scotusRole = data.roles?.find((r) =>
        r.role_title?.includes("Justice") || r.role_title?.includes("Chief Justice")
      );

      await pool.query(
        `INSERT INTO justices (identifier, name, last_name, role_title, appointing_president,
          date_start, date_end, home_state, law_school, thumbnail_url, fetched_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (identifier) DO UPDATE SET
           name = EXCLUDED.name,
           last_name = EXCLUDED.last_name,
           role_title = EXCLUDED.role_title,
           appointing_president = EXCLUDED.appointing_president,
           date_start = EXCLUDED.date_start,
           date_end = EXCLUDED.date_end,
           home_state = COALESCE(EXCLUDED.home_state, justices.home_state),
           law_school = COALESCE(EXCLUDED.law_school, justices.law_school),
           thumbnail_url = EXCLUDED.thumbnail_url,
           fetched_at = NOW()`,
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
      process.stdout.write(`  ${fetched} justices fetched\r`);
    } catch {
      console.warn(`  Skipping justice ${identifier} — error`);
    }
  }

  console.log(`  Justices: ${fetched} fetched, ${skipped} already existed`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Build term list from 1970 to current year
  const currentYear = new Date().getFullYear();
  const terms: string[] = [];
  for (let y = currentYear; y >= 1970; y--) {
    terms.push(y.toString());
  }

  for (const term of terms) {
    await seedTerm(pool, term);
  }

  const { rows } = await pool.query(`SELECT COUNT(*) as total FROM cases`);
  console.log(`\nCase seed complete. Total cases in DB: ${rows[0].total}`);

  // Sync justices from case vote data
  await syncJustices(pool);

  const { rows: jRows } = await pool.query(`SELECT COUNT(*) as total FROM justices`);
  console.log(`\nSeed complete. Total justices in DB: ${jRows[0].total}`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
