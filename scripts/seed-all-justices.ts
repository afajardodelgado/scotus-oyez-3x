import { Pool } from "pg";
import { ALL_JUSTICE_IDENTIFIERS } from "./all-justice-identifiers";

const OYEZ_BASE = "https://api.oyez.org";

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

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Fetching all ${ALL_JUSTICE_IDENTIFIERS.length} SCOTUS justices from Oyez...\n`);

  const { rows: existing } = await pool.query<{ identifier: string }>(
    `SELECT identifier FROM justices`
  );
  const existingIds = new Set(existing.map((r) => r.identifier));
  console.log(`Already have ${existingIds.size} justices in DB\n`);

  let fetched = 0;
  let skipped = 0;
  let failed = 0;
  const failedIds: string[] = [];

  for (const identifier of ALL_JUSTICE_IDENTIFIERS) {
    if (existingIds.has(identifier)) {
      skipped++;
      continue;
    }

    const url = `${OYEZ_BASE}/people/${identifier}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  FAILED ${identifier} — HTTP ${res.status}`);
        failed++;
        failedIds.push(identifier);
        continue;
      }
      const data: OyezJusticeResponse = await res.json();

      // Find SCOTUS role (Chief Justice or Associate Justice)
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
      process.stdout.write(`  ${fetched} fetched, ${skipped} skipped\r`);
    } catch (err) {
      console.warn(`  ERROR ${identifier}:`, err);
      failed++;
      failedIds.push(identifier);
    }
  }

  console.log(`\n\nDone: ${fetched} fetched, ${skipped} already existed, ${failed} failed`);
  if (failedIds.length > 0) {
    console.log(`\nFailed identifiers (may need correction):`);
    failedIds.forEach((id) => console.log(`  - ${id}`));
  }

  const { rows: total } = await pool.query(`SELECT COUNT(*) as count FROM justices`);
  console.log(`\nTotal justices in DB: ${total[0].count}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
