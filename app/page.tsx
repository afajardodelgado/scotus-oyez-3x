import { Suspense } from "react";
import Link from "next/link";
import { fetchRecentCases, fetchAvailableTerms } from "./lib/api";
import { getCurrentTerm } from "./lib/utils";
import CaseListItem from "./components/CaseListItem";
import SwipeToBookmark from "./components/SwipeToBookmark";
import TabBar from "./components/TabBar";
import TermSelector from "./components/TermSelector";
import HeaderMenu from "./components/HeaderMenu";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const params = await searchParams;
  const currentTerm = params.term || getCurrentTerm();
  const [cases, terms] = await Promise.all([
    fetchRecentCases(currentTerm),
    fetchAvailableTerms(),
  ]);

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <HeaderMenu current="/" />
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-fade tracking-wider">
                {cases.length} cases
              </span>
              <Link
                href={`/stats?term=${currentTerm}`}
                className="font-mono text-xs text-ink tracking-wider border border-ink px-2.5 py-1 active:bg-ink active:text-canvas transition-colors"
              >
                Stats
              </Link>
            </div>
          </div>
        </div>
        <Suspense>
          <TermSelector terms={terms} currentTerm={currentTerm} actualCurrentTerm={getCurrentTerm()} />
        </Suspense>
      </header>

      {/* Case List */}
      <main>
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="font-mono text-sm text-fade tracking-wider">
              No cases found for term {currentTerm}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-divider">
            {cases.map((c) => (
              <SwipeToBookmark
                key={c.id}
                bookmark={{
                  id: `case-${c.term}-${c.docketNumber}`,
                  type: "case",
                  title: `${c.firstParty} v. ${c.secondParty}`,
                  subtitle: c.docketNumber,
                  href: `/case/${c.term}/${c.docketNumber}`,
                }}
              >
                <CaseListItem case={c} />
              </SwipeToBookmark>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <TabBar />
    </div>
  );
}
