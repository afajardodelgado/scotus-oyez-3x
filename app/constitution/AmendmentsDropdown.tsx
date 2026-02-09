"use client";

import Link from "next/link";
import { useState } from "react";
import type { ConstitutionArticle } from "../lib/api";
import { amendmentSummaries } from "./amendmentSummaries";

export default function AmendmentsDropdown({
  amendments,
}: {
  amendments: ConstitutionArticle[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-divider">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-5 active:bg-ink/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <svg
              width="14"
              height="14"
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
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h2 className="font-serif text-lg leading-snug text-ink italic">
              Constitutional Amendments
            </h2>
            <span className="font-mono text-xs text-fade tracking-wider">
              {amendments.length} amendments
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-divider">
          {amendments.map((a) => {
            const num = a.article.replace("Amdt. ", "");
            const summary = amendmentSummaries[a.article] || "";

            return (
              <Link
                key={a.article}
                href={`/constitution/${encodeURIComponent(a.article)}`}
                className="block px-4 py-5 active:bg-ink/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-1.5">
                    <div className="w-3.5 h-3.5 border border-success bg-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-lg leading-snug text-ink italic">
                      Amendment {num}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-xs text-fade tracking-wider">
                        {a.article_title}
                      </span>
                      {a.section_count > 1 && (
                        <span className="font-mono text-xs text-fade tracking-wider">
                          {a.section_count} sections
                        </span>
                      )}
                    </div>
                    {summary && (
                      <p className="mt-2 font-serif text-sm text-fade leading-relaxed line-clamp-2">
                        {summary}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
