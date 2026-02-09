"use client";

import Link from "next/link";
import { useState } from "react";
import type { ConstitutionArticle } from "../lib/api";

const amendmentSummaries: Record<string, string> = {
  "Amdt. 1": "Protects freedom of religion, speech, press, assembly, and the right to petition the government. The bedrock of individual liberties.",
  "Amdt. 2": "Protects the right of the people to keep and bear arms in connection with a well-regulated militia.",
  "Amdt. 3": "Prohibits the forced quartering of soldiers in private homes during peacetime without the owner's consent.",
  "Amdt. 4": "Protects against unreasonable searches and seizures, requiring warrants to be based on probable cause.",
  "Amdt. 5": "Guarantees grand jury indictment, prohibits double jeopardy and self-incrimination, and requires due process and just compensation for takings.",
  "Amdt. 6": "Guarantees the right to a speedy public trial, an impartial jury, confrontation of witnesses, and assistance of counsel.",
  "Amdt. 7": "Preserves the right to a jury trial in civil cases exceeding twenty dollars in value.",
  "Amdt. 8": "Prohibits excessive bail, excessive fines, and cruel and unusual punishments.",
  "Amdt. 9": "Clarifies that the enumeration of specific rights does not deny or disparage other rights retained by the people.",
  "Amdt. 10": "Reserves powers not delegated to the federal government to the states or the people. The cornerstone of federalism.",
  "Amdt. 11": "Restricts federal court jurisdiction over suits brought against a state by citizens of another state or foreign country.",
  "Amdt. 12": "Revises presidential election procedures, requiring separate ballots for President and Vice President.",
  "Amdt. 13": "Abolishes slavery and involuntary servitude throughout the United States, except as punishment for a crime.",
  "Amdt. 14": "Defines citizenship, guarantees due process and equal protection, and addresses post-Civil War governance. The most litigated amendment.",
  "Amdt. 15": "Prohibits denying the right to vote based on race, color, or previous condition of servitude.",
  "Amdt. 16": "Authorizes Congress to levy an income tax without apportioning it among the states by population.",
  "Amdt. 17": "Establishes direct popular election of U.S. Senators, replacing selection by state legislatures.",
  "Amdt. 18": "Prohibited the manufacture, sale, and transportation of intoxicating liquors. Later repealed by the 21st Amendment.",
  "Amdt. 19": "Guarantees women the right to vote, prohibiting denial of suffrage on account of sex.",
  "Amdt. 20": "Moves the start of presidential and congressional terms to January, eliminating the long 'lame duck' period.",
  "Amdt. 21": "Repeals the 18th Amendment (Prohibition), returning alcohol regulation to the states.",
  "Amdt. 22": "Limits the President to two terms in office, codifying the precedent set by George Washington.",
  "Amdt. 23": "Grants residents of the District of Columbia the right to vote in presidential elections through electoral votes.",
  "Amdt. 24": "Abolishes poll taxes in federal elections, removing a barrier used to disenfranchise poor and minority voters.",
  "Amdt. 25": "Establishes procedures for presidential succession and disability, including the transfer of power to the Vice President.",
  "Amdt. 26": "Lowers the voting age to eighteen, enacted during the Vietnam War era under the principle 'old enough to fight, old enough to vote.'",
  "Amdt. 27": "Delays congressional pay raises until after the next election of Representatives. Proposed in 1789, ratified in 1992.",
};

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
                    <div className="w-3.5 h-3.5 border border-[#4A5D23] bg-[#4A5D23]" />
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
