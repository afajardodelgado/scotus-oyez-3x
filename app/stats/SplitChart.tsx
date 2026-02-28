"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { VoteSplitStats } from "../lib/api";
import type { CaseSummary } from "../lib/types";
import { getCasesByVoteSplit } from "./actions";

export default function SplitChart({
  splits,
  maxCount,
  term,
}: {
  splits: VoteSplitStats[];
  maxCount: number;
  term: string;
}) {
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleBarClick(label: string) {
    if (selectedSplit === label) {
      setSelectedSplit(null);
      setCases([]);
      return;
    }

    setSelectedSplit(label);
    startTransition(async () => {
      const result = await getCasesByVoteSplit(term, label);
      setCases(result);
    });
  }

  return (
    <>
      {/* Bar Chart */}
      <div
        className="flex items-end justify-center gap-4 px-2"
        style={{ height: "224px" }}
      >
        {splits.map((split) => {
          const barHeight =
            maxCount > 0 ? Math.round((split.count / maxCount) * 200) : 0;
          const isSelected = selectedSplit === split.label;

          return (
            <button
              key={split.label}
              onClick={() => handleBarClick(split.label)}
              className="flex-1 flex flex-col items-center cursor-pointer"
              style={{ height: "224px", justifyContent: "flex-end" }}
            >
              <span
                className="font-mono text-xs text-ink"
                style={{ marginBottom: "4px" }}
              >
                {split.count}
              </span>
              <div
                className={`w-full transition-colors ${
                  isSelected ? "bg-citation" : "bg-ink"
                }`}
                style={{
                  height: `${barHeight}px`,
                  minHeight: split.count > 0 ? "4px" : "0px",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-center gap-4 px-2 pt-2 border-t border-ink">
        {splits.map((split) => (
          <button
            key={split.label}
            onClick={() => handleBarClick(split.label)}
            className="flex-1 text-center cursor-pointer"
          >
            <span
              className={`font-mono text-xs tracking-wider transition-colors ${
                selectedSplit === split.label
                  ? "text-citation font-medium"
                  : "text-fade"
              }`}
            >
              {split.label}
            </span>
          </button>
        ))}
      </div>

      {/* Expanded case list */}
      {selectedSplit && (
        <div className="mt-4 border border-divider">
          <div className="flex items-center justify-between px-4 py-2 border-b border-divider">
            <span className="font-mono text-xs text-ink tracking-wider">
              {selectedSplit} Decisions
              {!isPending && (
                <span className="text-fade ml-1">({cases.length})</span>
              )}
            </span>
            <button
              onClick={() => {
                setSelectedSplit(null);
                setCases([]);
              }}
              className="font-mono text-xs text-fade active:text-ink transition-colors px-1"
            >
              Close
            </button>
          </div>

          {isPending ? (
            <div className="px-4 py-6 text-center">
              <span className="font-mono text-xs text-fade tracking-wider">
                Loading...
              </span>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto divide-y divide-divider">
              {cases.map((c) => (
                <Link
                  key={c.id}
                  href={`/case/${c.term}/${c.docketNumber}`}
                  className="flex items-baseline justify-between px-4 py-3 active:bg-ink/5 transition-colors"
                >
                  <span className="font-serif text-sm text-ink italic leading-snug min-w-0 mr-3">
                    {c.firstParty} v. {c.secondParty}
                  </span>
                  <span className="font-mono text-xs text-fade tracking-wider shrink-0">
                    {c.docketNumber}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
