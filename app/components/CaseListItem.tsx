import Link from "next/link";
import { CaseSummary } from "../lib/types";

export default function CaseListItem({ case: c }: { case: CaseSummary }) {
  const voteDisplay =
    c.majorityVotes && c.minorityVotes !== undefined
      ? `${c.majorityVotes}-${c.minorityVotes}`
      : "";

  return (
    <Link
      href={`/case/${c.term}/${c.docketNumber}`}
      className="block px-4 py-5 active:bg-ink/5 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-1.5">
          <div
            className={`w-3.5 h-3.5 border ${
              c.isDecided
                ? "border-success bg-success"
                : "border-fade/40 bg-transparent"
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg leading-snug text-ink italic">
            {c.firstParty} v. {c.secondParty}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-xs text-fade tracking-wider">
              {c.docketNumber}
            </span>
            {c.decisionDate && (
              <span className="font-mono text-xs text-fade tracking-wider">
                {c.decisionDate}
              </span>
            )}
            {voteDisplay && (
              <span className="font-mono text-xs text-fade tracking-wider font-medium">
                {voteDisplay}
              </span>
            )}
          </div>
          {c.description && (
            <p className="mt-2 font-serif text-sm text-fade leading-relaxed line-clamp-2">
              {c.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
