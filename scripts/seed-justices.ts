import { Pool } from "pg";

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

  console.log("Extracting justice hrefs from case vote data...");

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

  console.log(`Found ${justiceHrefs.size} unique justice hrefs`);

  const { rows: existing } = await pool.query<{ identifier: string }>(
    `SELECT identifier FROM justices`
  );
  const existingIds = new Set(existing.map((r) => r.identifier));
  console.log(`Already have ${existingIds.size} justices in DB`);

  let fetched = 0;
  let skipped = 0;

  for (const href of justiceHrefs) {
    const identifier = href.split("/people/")[1];
    if (!identifier) continue;

    if (existingIds.has(identifier)) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(href);
      if (!res.ok) {
        console.warn(`  Skipping ${identifier} — ${res.status}`);
        continue;
      }
      const data: OyezJusticeResponse = await res.json();

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
      console.warn(`  Skipping ${identifier} — error`);
    }
  }

  console.log(`\nDone: ${fetched} fetched, ${skipped} already existed`);

  const { rows: total } = await pool.query(`SELECT COUNT(*) as count FROM justices`);
  console.log(`Total justices in DB: ${total[0].count}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
