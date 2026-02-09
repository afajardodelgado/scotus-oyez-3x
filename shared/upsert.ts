import type { Pool } from "pg";
import type { OyezCase } from "./types";

export async function upsertCase(pool: Pool, detail: OyezCase): Promise<void> {
  const decided =
    detail.decisions?.[0]?.majority_vote !== undefined &&
    detail.decisions?.[0]?.minority_vote !== undefined;

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
}
