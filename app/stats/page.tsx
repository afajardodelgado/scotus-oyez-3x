import { Suspense } from "react";
import Link from "next/link";
import { fetchTermStats, fetchAvailableTerms, fetchJusticeAgreement } from "../lib/api";
import { getCurrentTerm } from "../lib/utils";
import TermSelector from "../components/TermSelector";
import TabBar from "../components/TabBar";
import SplitChart from "./SplitChart";
import AgreementMatrix from "./AgreementMatrix";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const params = await searchParams;
  const currentTerm = params.term || getCurrentTerm();
  const [{ splits, totalCases }, terms, agreement] = await Promise.all([
    fetchTermStats(currentTerm),
    fetchAvailableTerms(),
    fetchJusticeAgreement(currentTerm),
  ]);

  const maxCount = Math.max(...splits.map((s) => s.count), 1);

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 py-3">
            <Link
              href={`/?term=${currentTerm}`}
              className="font-mono text-sm text-fade tracking-wider active:text-ink transition-colors"
            >
              &larr;
            </Link>
            <h1 className="font-serif text-xl text-ink">Term Statistics</h1>
          </div>
        </div>
        <Suspense>
          <TermSelector terms={terms} currentTerm={currentTerm} baseUrl="/stats" />
        </Suspense>
      </header>

      <main className="px-4">
        {/* Chart Title */}
        <div className="pt-6 pb-4 text-center">
          <h2 className="font-serif text-lg text-ink">
            Decision Splits ({currentTerm})
          </h2>
        </div>

        <SplitChart splits={splits} maxCount={maxCount} term={currentTerm} />

        {/* Total */}
        <div className="pt-8 text-center">
          <p className="font-mono text-sm text-ink tracking-wider">
            Total Cases Decided: {totalCases}
          </p>
        </div>

        {/* Justice Agreement Matrix */}
        {agreement.justices.length > 0 && (
          <AgreementMatrix agreement={agreement} term={currentTerm} />
        )}
      </main>

      <TabBar />
    </div>
  );
}
