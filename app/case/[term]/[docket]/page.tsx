import Link from "next/link";
import { fetchCaseDetail } from "../../../lib/api";
import { formatTimestamp, stripHtml } from "../../../lib/utils";
import TabBar from "../../../components/TabBar";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ term: string; docket: string }>;
}) {
  const { term, docket } = await params;
  const caseData = await fetchCaseDetail(term, docket);

  if (!caseData) {
    return (
      <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4">
        <p className="font-mono text-sm text-error tracking-wider">
          Case not found. Retry.
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
        >
          Return to cases
        </Link>
        <TabBar />
      </div>
    );
  }

  const decision = caseData.decisions?.[0];
  const voteDisplay =
    decision
      ? `${decision.majority_vote}-${decision.minority_vote}`
      : "";
  const decisionDate = caseData.decision_date
    ? formatTimestamp(parseInt(caseData.decision_date))
    : null;

  const majorityVotes =
    decision?.votes?.filter((v) => v.vote === "majority") || [];
  const dissentVotes =
    decision?.votes?.filter((v) => v.vote === "minority") || [];

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 py-3">
            <Link
              href={`/?term=${term}`}
              className="font-mono text-xs text-fade tracking-wider active:text-ink transition-colors shrink-0"
            >
              &larr; Back
            </Link>
            <h1 className="font-serif text-base text-ink italic truncate">
              {caseData.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4">
        {/* Case Title */}
        <section className="pt-6 pb-4">
          <h2 className="font-serif text-2xl text-ink italic leading-tight">
            {caseData.first_party} v. {caseData.second_party}
          </h2>
        </section>

        {/* Metadata Block */}
        <section className="py-4 border-t border-divider space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-fade tracking-wider w-20">
              Docket
            </span>
            <span className="font-mono text-xs text-ink tracking-wider">
              {caseData.docket_number}
            </span>
          </div>
          {decisionDate && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-20">
                Decided
              </span>
              <span className="font-mono text-xs text-ink tracking-wider">
                {decisionDate}
              </span>
            </div>
          )}
          {voteDisplay && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-20">
                Vote
              </span>
              <span className="font-mono text-xs text-ink tracking-wider font-medium">
                {voteDisplay}
              </span>
            </div>
          )}
          {decision?.decision_type && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-20">
                Type
              </span>
              <span className="font-mono text-xs text-ink tracking-wider">
                {decision.decision_type}
              </span>
            </div>
          )}
          {decision?.winning_party && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-20">
                Winner
              </span>
              <span className="font-mono text-xs text-ink tracking-wider">
                {decision.winning_party}
              </span>
            </div>
          )}
        </section>

        {/* Votes Breakdown */}
        {(majorityVotes.length > 0 || dissentVotes.length > 0) && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Votes
            </h3>
            {majorityVotes.length > 0 && (
              <div className="mb-3">
                <span className="font-mono text-xs text-success tracking-wider">
                  Majority
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {majorityVotes.map((v) => (
                    <span
                      key={v.member.name}
                      className="font-serif text-sm text-ink"
                    >
                      Justice {v.member.last_name || v.member.name}
                      {v.opinion_type === "majority" && (
                        <span className="font-mono text-xs text-fade ml-1">
                          (authored)
                        </span>
                      )}
                      {majorityVotes.indexOf(v) < majorityVotes.length - 1 && (
                        <span className="text-divider ml-1 mr-1">|</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {dissentVotes.length > 0 && (
              <div>
                <span className="font-mono text-xs text-error tracking-wider">
                  Dissent
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {dissentVotes.map((v) => (
                    <span
                      key={v.member.name}
                      className="font-serif text-sm text-ink"
                    >
                      Justice {v.member.last_name || v.member.name}
                      {dissentVotes.indexOf(v) < dissentVotes.length - 1 && (
                        <span className="text-divider ml-1 mr-1">|</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Written Opinions */}
        {caseData.written_opinion && caseData.written_opinion.length > 0 && (() => {
          const opinions = caseData.written_opinion.filter(
            (o) => o.type?.value !== "syllabus"
          );
          if (opinions.length === 0) return null;

          const grouped: Record<string, typeof opinions> = {};
          for (const o of opinions) {
            const category = o.type?.label || o.title || "Opinion";
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(o);
          }

          // Order: majority first, then concurring, then dissenting
          const order = ["Opinion of the Court", "Concurring opinion", "Concurrence in part", "Dissenting opinion", "Dissent in part"];
          const sortedKeys = Object.keys(grouped).sort((a, b) => {
            const ai = order.findIndex((o) => a.includes(o));
            const bi = order.findIndex((o) => b.includes(o));
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });

          return (
            <section className="py-4 border-t border-divider">
              <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
                Written Opinions
              </h3>
              <div className="space-y-3">
                {sortedKeys.map((category) => (
                  <div key={category}>
                    <span className="font-mono text-xs text-fade tracking-wider">
                      {category}
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {grouped[category].map((o) => (
                        <div key={o.id} className="flex items-baseline gap-2">
                          {o.judge_full_name && (
                            <span className="font-serif text-sm text-ink">
                              {o.judge_full_name}
                            </span>
                          )}
                          {o.justia_opinion_url && (
                            <a
                              href={o.justia_opinion_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-citation tracking-wider underline underline-offset-2"
                            >
                              Read opinion
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Facts of the Case */}
        {caseData.facts_of_the_case && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Facts of the Case
            </h3>
            <p className="font-serif text-base text-ink leading-[1.7]">
              {stripHtml(caseData.facts_of_the_case)}
            </p>
          </section>
        )}

        {/* Question Presented */}
        {caseData.question && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Question Presented
            </h3>
            <p className="font-serif text-base text-ink leading-[1.7] italic">
              {stripHtml(caseData.question)}
            </p>
          </section>
        )}

        {/* Conclusion */}
        {caseData.conclusion && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Conclusion
            </h3>
            <p className="font-serif text-base text-ink leading-[1.7]">
              {stripHtml(caseData.conclusion)}
            </p>
          </section>
        )}

        {/* Advocates */}
        {caseData.advocates && caseData.advocates.length > 0 && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Advocates
            </h3>
            <div className="space-y-2">
              {caseData.advocates.map((adv, i) => (
                <div key={i}>
                  <span className="font-serif text-sm text-ink">
                    {adv.advocate?.name}
                  </span>
                  {adv.advocate_description && (
                    <span className="font-mono text-xs text-fade ml-2">
                      {adv.advocate_description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* External Link */}
        {caseData.justia_url && (
          <section className="py-6 border-t border-divider">
            <a
              href={caseData.justia_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
            >
              Read full opinion
            </a>
          </section>
        )}
      </main>

      <TabBar />
    </div>
  );
}
