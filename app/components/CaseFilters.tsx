"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "../hooks/useClickOutside";

const STAGES = [
  { value: "all", label: "All" },
  { value: "decided", label: "Decided" },
  { value: "argued", label: "Argued" },
  { value: "granted", label: "Granted" },
] as const;

const SORTS = [
  { value: "default", label: "Default Order" },
  { value: "recent-decision", label: "Recent Decisions" },
  { value: "recently-argued", label: "Recently Argued" },
  { value: "recently-granted", label: "Recently Granted" },
] as const;

const SPLITS = [
  { value: "all", label: "All Splits" },
  { value: "unanimous", label: "Unanimous" },
  { value: "close", label: "Close (5-4, 6-3)" },
] as const;

interface CaseFiltersProps {
  counts: {
    all: number;
    decided: number;
    argued: number;
    granted: number;
  };
}

export default function CaseFilters({ counts }: CaseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useClickOutside(sortRef, sortOpen, useCallback(() => setSortOpen(false), []));

  const currentStage = searchParams.get("stage") || "all";
  const currentSort = searchParams.get("sort") || "default";
  const currentSplit = searchParams.get("split") || "all";

  const showSplitFilter = currentStage === "all" || currentStage === "decided";
  const currentSortLabel = SORTS.find((s) => s.value === currentSort)?.label || "Default Order";

  function updateParam(key: string, value: string, defaultValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key === "stage" && value !== "all" && value !== "decided") {
      params.delete("split");
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  const chipBase = "shrink-0 font-mono text-xs tracking-wider px-3 py-1.5 border transition-colors";
  const chipActive = `${chipBase} border-ink bg-ink text-canvas`;
  const chipInactive = `${chipBase} border-ink bg-transparent text-ink active:bg-ink active:text-canvas`;

  return (
    <div className="px-4 py-3 border-b border-divider space-y-2">
      {/* Stage chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
        {STAGES.map((s) => {
          const count = counts[s.value as keyof typeof counts];
          return (
            <button
              key={s.value}
              onClick={() => updateParam("stage", s.value, "all")}
              className={currentStage === s.value ? chipActive : chipInactive}
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Sort dropdown + split chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 font-mono text-xs tracking-wider text-ink active:opacity-70 transition-opacity"
          >
            <span className="text-fade">Sort:</span>
            <span>{currentSortLabel}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${sortOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {sortOpen && (
            <div className="absolute left-0 top-full mt-1 bg-canvas border border-ink z-50 min-w-[200px]">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    updateParam("sort", s.value, "default");
                    setSortOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
                >
                  {currentSort === s.value && (
                    <span className="mr-1.5">*</span>
                  )}
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Split chips */}
        {showSplitFilter && (
          <div className="flex gap-2 ml-auto">
            {SPLITS.map((s) => (
              <button
                key={s.value}
                onClick={() => updateParam("split", s.value, "all")}
                className={currentSplit === s.value ? chipActive : chipInactive}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
