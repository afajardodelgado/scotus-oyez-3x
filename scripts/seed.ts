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
  timeline: { event: string; dates: number[] }[];
}

function isDecided(caseData: OyezCase): boolean {
  if (!caseData.decisions?.[0]) return false;
  const d = caseData.decisions[0];
  return d.majority_vote !== undefined && d.minority_vote !== undefined;
}

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

    const decided = isDecided(detail);

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
