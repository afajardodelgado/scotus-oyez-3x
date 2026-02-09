import { Pool } from "pg";
import type { OyezCaseListItem, OyezCase } from "../../shared/types";
import { upsertCase } from "../../shared/upsert";

const OYEZ_BASE = "https://api.oyez.org";

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
