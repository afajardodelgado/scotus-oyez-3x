import { Pool } from "pg";

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Running migration...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      term          TEXT NOT NULL,
      docket_number TEXT NOT NULL,
      name          TEXT NOT NULL,
      first_party   TEXT,
      second_party  TEXT,
      description   TEXT,
      facts_of_the_case TEXT,
      question      TEXT,
      conclusion    TEXT,
      decision_date TEXT,
      citation      JSONB,
      justia_url    TEXT,
      href          TEXT NOT NULL,
      decisions     JSONB DEFAULT '[]',
      advocates     JSONB DEFAULT '[]',
      timeline      JSONB DEFAULT '[]',
      is_decided    BOOLEAN NOT NULL DEFAULT FALSE,
      fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (term, docket_number)
    );
  `);

  console.log("Migration complete — cases table created.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
