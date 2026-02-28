"use server";

import { fetchCasesByVoteSplit, fetchCasesByJusticePair } from "../lib/api";
import type { CaseSummary } from "../lib/types";

export async function getCasesByVoteSplit(
  term: string,
  split: string
): Promise<CaseSummary[]> {
  return fetchCasesByVoteSplit(term, split);
}

export async function getCasesByJusticePair(
  term: string,
  j1: string,
  j2: string,
  mode: "agreed" | "disagreed"
): Promise<CaseSummary[]> {
  return fetchCasesByJusticePair(term, j1, j2, mode);
}
