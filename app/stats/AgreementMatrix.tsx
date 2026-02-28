"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { JusticeAgreementData } from "../lib/api";
import type { CaseSummary } from "../lib/types";
import { getCasesByJusticePair } from "./actions";

type Mode = "agreed" | "disagreed";

export default function AgreementMatrix({
  agreement,
  term,
}: {
  agreement: JusticeAgreementData;
  term: string;
}) {
  const [selectedCell, setSelectedCell] = useState<{
    j1: string;
    j2: string;
  } | null>(null);
  const [mode, setMode] = useState<Mode>("agreed");
  const [agreedCases, setAgreedCases] = useState<CaseSummary[]>([]);
  const [disagreedCases, setDisagreedCases] = useState<CaseSummary[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleCellClick(j1: string, j2: string) {
    if (j1 === j2) return;

    if (selectedCell?.j1 === j1 && selectedCell?.j2 === j2) {
      setSelectedCell(null);
      setAgreedCases([]);
      setDisagreedCases([]);
      return;
    }

    setSelectedCell({ j1, j2 });
    setMode("agreed");
    startTransition(async () => {
      const [agreed, disagreed] = await Promise.all([
        getCasesByJusticePair(term, j1, j2, "agreed"),
        getCasesByJusticePair(term, j1, j2, "disagreed"),
      ]);
      setAgreedCases(agreed);
      setDisagreedCases(disagreed);
    });
  }

  const activeCases = mode === "agreed" ? agreedCases : disagreedCases;

  return (
    <section className="pt-10 pb-6">
      <div className="text-center pb-4">
        <h2 className="font-serif text-lg text-ink">
          Justice Agreement ({term})
        </h2>
        <p className="font-mono text-xs text-fade tracking-wider mt-1">
          {agreement.caseCount} non-unanimous cases
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table
          className="w-full border-collapse"
          style={{
            minWidth: `${agreement.justices.length * 44 + 72}px`,
          }}
        >
          <thead>
            <tr>
              <th className="sticky left-0 bg-canvas z-10" />
              {agreement.justices.map((j) => (
                <th
                  key={j}
                  className="font-mono text-[10px] text-fade tracking-wider py-2 px-1 text-center"
                  style={{ minWidth: "40px" }}
                >
                  <span
                    className="inline-block"
                    style={{
                      writingMode: "vertical-lr",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {j}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agreement.justices.map((j1) => (
              <tr key={j1}>
                <td className="sticky left-0 bg-canvas z-10 font-mono text-[10px] text-fade tracking-wider pr-2 py-1 text-right whitespace-nowrap">
                  {j1}
                </td>
                {agreement.justices.map((j2) => {
                  const cell = agreement.matrix[j1]?.[j2];
                  const rate = cell?.rate ?? 0;
                  const pct = Math.round(rate * 100);
                  const isDiagonal = j1 === j2;
                  const isSelected =
                    selectedCell &&
                    ((selectedCell.j1 === j1 && selectedCell.j2 === j2) ||
                      (selectedCell.j1 === j2 && selectedCell.j2 === j1));

                  const opacity = isDiagonal ? 0 : Math.max(0.05, rate);
                  const bg = isDiagonal
                    ? "transparent"
                    : rate >= 0.7
                      ? `rgba(74, 93, 35, ${opacity})`
                      : rate >= 0.4
                        ? `rgba(136, 136, 136, ${opacity * 0.8})`
                        : `rgba(158, 42, 43, ${opacity})`;

                  return (
                    <td
                      key={j2}
                      onClick={
                        !isDiagonal && cell && cell.total > 0
                          ? () => handleCellClick(j1, j2)
                          : undefined
                      }
                      className={`text-center py-1 px-1 ${
                        !isDiagonal && cell && cell.total > 0
                          ? "cursor-pointer"
                          : ""
                      } ${isSelected ? "ring-2 ring-citation ring-inset" : ""}`}
                      style={{
                        backgroundColor: bg,
                        minWidth: "40px",
                      }}
                    >
                      {!isDiagonal && cell && cell.total > 0 && (
                        <span
                          className={`font-mono text-[10px] ${
                            rate >= 0.7 && opacity > 0.5
                              ? "text-canvas"
                              : rate < 0.4 && opacity > 0.3
                                ? "text-canvas"
                                : "text-ink"
                          }`}
                        >
                          {pct}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "rgba(158, 42, 43, 0.4)" }}
          />
          <span className="font-mono text-[10px] text-fade tracking-wider">
            Low
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "rgba(136, 136, 136, 0.5)" }}
          />
          <span className="font-mono text-[10px] text-fade tracking-wider">
            Mid
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "rgba(74, 93, 35, 0.7)" }}
          />
          <span className="font-mono text-[10px] text-fade tracking-wider">
            High
          </span>
        </div>
      </div>

      {/* Expanded case list */}
      {selectedCell && (
        <div className="mt-4 border border-divider mx-0">
          <div className="px-4 py-2 border-b border-divider">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-ink tracking-wider">
                {selectedCell.j1} & {selectedCell.j2}
              </span>
              <button
                onClick={() => {
                  setSelectedCell(null);
                  setAgreedCases([]);
                  setDisagreedCases([]);
                }}
                className="font-mono text-xs text-fade active:text-ink transition-colors px-1"
              >
                Close
              </button>
            </div>

            {/* Tabs */}
            {!isPending && (
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setMode("agreed")}
                  className={`font-mono text-xs tracking-wider pb-1 border-b-2 transition-colors ${
                    mode === "agreed"
                      ? "text-ink border-ink"
                      : "text-fade border-transparent"
                  }`}
                >
                  Agreed ({agreedCases.length})
                </button>
                <button
                  onClick={() => setMode("disagreed")}
                  className={`font-mono text-xs tracking-wider pb-1 border-b-2 transition-colors ${
                    mode === "disagreed"
                      ? "text-ink border-ink"
                      : "text-fade border-transparent"
                  }`}
                >
                  Disagreed ({disagreedCases.length})
                </button>
              </div>
            )}
          </div>

          {isPending ? (
            <div className="px-4 py-6 text-center">
              <span className="font-mono text-xs text-fade tracking-wider">
                Loading...
              </span>
            </div>
          ) : activeCases.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <span className="font-mono text-xs text-fade tracking-wider">
                No cases
              </span>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto divide-y divide-divider">
              {activeCases.map((c) => (
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
    </section>
  );
}
