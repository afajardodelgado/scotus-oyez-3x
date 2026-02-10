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

  console.log("Cases table ready.");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS constitution_sections (
      id            SERIAL PRIMARY KEY,
      article       TEXT NOT NULL,
      article_title TEXT NOT NULL,
      section_number INTEGER,
      section_title TEXT,
      text          TEXT NOT NULL,
      sort_order    INTEGER NOT NULL DEFAULT 0
    );
  `);

  console.log("Constitution table ready.");

  // Add written_opinion column if it doesn't exist
  await pool.query(`
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS written_opinion JSONB DEFAULT '[]';
  `);
  console.log("written_opinion column ready.");

  // Enable pg_trgm for fuzzy matching
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  console.log("pg_trgm extension enabled.");

  // Add search_vector column if it doesn't exist
  await pool.query(`
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS search_vector tsvector;
  `);

  // Create GIN index for fast full-text search
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cases_search_vector
    ON cases USING GIN (search_vector);
  `);

  // Create trigram index on name for fuzzy matching
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cases_name_trgm
    ON cases USING GIN (name gin_trgm_ops);
  `);

  console.log("Search indexes created.");

  // Backfill search_vector for existing rows
  await pool.query(`
    UPDATE cases SET search_vector =
      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(first_party, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(second_party, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(question, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(facts_of_the_case, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(conclusion, '')), 'C')
    WHERE search_vector IS NULL;
  `);

  console.log("Backfilled search_vector for existing rows.");

  // Justices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS justices (
      identifier         TEXT PRIMARY KEY,
      name               TEXT NOT NULL,
      last_name          TEXT NOT NULL,
      role_title         TEXT,
      appointing_president TEXT,
      date_start         BIGINT,
      date_end           BIGINT DEFAULT 0,
      home_state         TEXT,
      law_school         TEXT,
      thumbnail_url      TEXT,
      fetched_at         TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("Justices table ready.");

  console.log("Migration complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
