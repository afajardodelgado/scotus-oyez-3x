"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function TermSelector({
  terms,
  currentTerm,
  baseUrl = "/",
}: {
  terms: string[];
  currentTerm: string;
  baseUrl?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTermChange = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("term", term);
    router.push(`${baseUrl}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
      {terms.map((term) => (
        <button
          key={term}
          onClick={() => handleTermChange(term)}
          className={`
            shrink-0 px-3 py-1.5
            font-mono text-xs tracking-wider
            border transition-colors
            ${
              currentTerm === term
                ? "bg-ink text-canvas border-ink"
                : "bg-transparent text-fade border-divider active:bg-ink/5"
            }
          `}
        >
          {term}
        </button>
      ))}
    </div>
  );
}
