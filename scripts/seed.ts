import { Pool } from "pg";
import type { OyezCaseListItem, OyezCase } from "../shared/types";
import { upsertCase } from "../shared/upsert";

const OYEZ_BASE = "https://api.oyez.org";

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

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Seed recent terms (adjust range as needed)
  const terms = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

  for (const term of terms) {
    await seedTerm(pool, term);
  }

  const { rows } = await pool.query(`SELECT COUNT(*) as total FROM cases`);
  console.log(`\nSeed complete. Total cases in DB: ${rows[0].total}`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
