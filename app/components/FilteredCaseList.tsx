"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import type { CaseSummary } from "../lib/types";
import CaseFilters from "./CaseFilters";
import CaseListItem from "./CaseListItem";
import SwipeToBookmark from "./SwipeToBookmark";

function filterCases(
  cases: CaseSummary[],
  stage: string,
  split: string
): CaseSummary[] {
  let result = cases;

  if (stage !== "all") {
    result = result.filter((c) => c.stage === stage);
  }

  if (split === "unanimous") {
    result = result.filter(
      (c) => c.stage !== "decided" || c.minorityVotes === 0
    );
  } else if (split === "close") {
    result = result.filter(
      (c) =>
        c.stage !== "decided" ||
        (c.minorityVotes >= 3 && c.minorityVotes <= 4)
    );
  }

  return result;
}

function sortCases(cases: CaseSummary[], sort: string): CaseSummary[] {
  if (sort === "default") return cases;

  const sorted = [...cases];

  switch (sort) {
    case "recent-decision":
      sorted.sort((a, b) => {
        if (a.decisionTimestamp && b.decisionTimestamp)
          return b.decisionTimestamp - a.decisionTimestamp;
        if (a.decisionTimestamp) return -1;
        if (b.decisionTimestamp) return 1;
        return 0;
      });
      break;

    case "recently-argued":
      sorted.sort((a, b) => {
        if (a.arguedTimestamp && b.arguedTimestamp)
          return b.arguedTimestamp - a.arguedTimestamp;
        if (a.arguedTimestamp) return -1;
        if (b.arguedTimestamp) return 1;
        return 0;
      });
      break;

    case "recently-granted":
      sorted.sort((a, b) => {
        if (a.grantedTimestamp && b.grantedTimestamp)
          return b.grantedTimestamp - a.grantedTimestamp;
        if (a.grantedTimestamp) return -1;
        if (b.grantedTimestamp) return 1;
        return 0;
      });
      break;
  }

  return sorted;
}

function FilteredCaseListInner({ cases }: { cases: CaseSummary[] }) {
  const searchParams = useSearchParams();

  const stage = searchParams.get("stage") || "all";
  const sort = searchParams.get("sort") || "default";
  const split = searchParams.get("split") || "all";

  const counts = useMemo(
    () => ({
      all: cases.length,
      decided: cases.filter((c) => c.stage === "decided").length,
      argued: cases.filter((c) => c.stage === "argued").length,
      granted: cases.filter((c) => c.stage === "granted").length,
    }),
    [cases]
  );

  const filteredAndSorted = useMemo(() => {
    const filtered = filterCases(cases, stage, split);
    return sortCases(filtered, sort);
  }, [cases, stage, sort, split]);

  return (
    <>
      <CaseFilters counts={counts} />

      {filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="font-mono text-sm text-fade tracking-wider">
            No cases match the current filters.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-divider">
          {filteredAndSorted.map((c) => (
            <SwipeToBookmark
              key={c.id}
              bookmark={{
                id: `case-${c.term}-${c.docketNumber}`,
                type: "case",
                title: `${c.firstParty} v. ${c.secondParty}`,
                subtitle: c.docketNumber,
                href: `/case/${c.term}/${c.docketNumber}`,
              }}
            >
              <CaseListItem case={c} />
            </SwipeToBookmark>
          ))}
        </div>
      )}
    </>
  );
}

export default function FilteredCaseList({ cases }: { cases: CaseSummary[] }) {
  return (
    <Suspense>
      <FilteredCaseListInner cases={cases} />
    </Suspense>
  );
}
