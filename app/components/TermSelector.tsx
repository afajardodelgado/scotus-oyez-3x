"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "../hooks/useClickOutside";

function formatTermLabel(term: string, actualCurrentTerm?: string, withSuffix = true): string {
  if (actualCurrentTerm && term === actualCurrentTerm) {
    return `Current Term (${term})`;
  }
  return withSuffix ? `${term} Term` : term;
}

export default function TermSelector({
  terms,
  currentTerm,
  baseUrl = "/",
  actualCurrentTerm,
}: {
  terms: string[];
  currentTerm: string;
  baseUrl?: string;
  actualCurrentTerm?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, open, useCallback(() => setOpen(false), []));

  const handleTermChange = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("term", term);
    router.push(`${baseUrl}?${params.toString()}`);
    setOpen(false);
  };

  const otherTerms = terms.filter((t) => t !== currentTerm);

  return (
    <div ref={menuRef} className="relative px-4 py-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
      >
        <span className="font-serif text-lg text-ink">{formatTermLabel(currentTerm, actualCurrentTerm)}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-ink transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-4 top-full mt-1 bg-canvas border border-ink z-50 min-w-[140px] max-h-[300px] overflow-y-auto">
          {otherTerms.map((term) => (
            <button
              key={term}
              onClick={() => handleTermChange(term)}
              className="block w-full text-left px-4 py-2.5 font-serif text-lg text-ink active:bg-ink active:text-canvas transition-colors"
            >
              {formatTermLabel(term, actualCurrentTerm, false)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
