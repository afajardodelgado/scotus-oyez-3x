import Link from "next/link";
import type { CaseSummary, CaseStage } from "../lib/types";

const stageLabel: Record<CaseStage, string> = {
  granted: "Granted",
  argued: "Argued",
  decided: "Decided",
};

function StageIndicator({ stage }: { stage: CaseStage }) {
  const granted = stage === "granted" || stage === "argued" || stage === "decided";
  const argued = stage === "argued" || stage === "decided";
  const decided = stage === "decided";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`w-2.5 h-2.5 border ${
          decided ? "border-success bg-success" : "border-fade/30 bg-transparent"
        }`}
      />
      <div className="w-px h-1 bg-fade/20" />
      <div
        className={`w-2.5 h-2.5 border ${
          argued ? "border-citation bg-citation" : "border-fade/30 bg-transparent"
        }`}
      />
      <div className="w-px h-1 bg-fade/20" />
      <div
        className={`w-2.5 h-2.5 border ${
          granted ? "border-fade/60 bg-fade/60" : "border-fade/30 bg-transparent"
        }`}
      />
    </div>
  );
}

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
        <div className="shrink-0 pt-1">
          <StageIndicator stage={c.stage} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg leading-snug text-ink italic">
            {c.firstParty} v. {c.secondParty}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-xs text-fade tracking-wider">
              {c.docketNumber}
            </span>
            {c.stage !== "decided" && (
              <span
                className={`font-mono text-xs tracking-wider ${
                  c.stage === "argued" ? "text-citation" : "text-fade"
                }`}
              >
                {stageLabel[c.stage]}
              </span>
            )}
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
