import { Suspense } from "react";
import Link from "next/link";
import { fetchTermStats, fetchAvailableTerms } from "../lib/api";
import TermSelector from "../components/TermSelector";
import TabBar from "../components/TabBar";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const params = await searchParams;
  const currentTerm = params.term || "2023";
  const [{ splits, totalCases }, terms] = await Promise.all([
    fetchTermStats(currentTerm),
    fetchAvailableTerms(),
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

        {/* Bar Chart */}
        <div className="flex items-end justify-center gap-4 px-2" style={{ height: "224px" }}>
          {splits.map((split) => {
            const barHeight = maxCount > 0 ? Math.round((split.count / maxCount) * 200) : 0;
            return (
              <div key={split.label} className="flex-1 flex flex-col items-center" style={{ height: "224px", justifyContent: "flex-end" }}>
                <span className="font-mono text-xs text-ink" style={{ marginBottom: "4px" }}>
                  {split.count}
                </span>
                <div
                  className="bg-ink"
                  style={{
                    width: "100%",
                    height: `${barHeight}px`,
                    minHeight: split.count > 0 ? "4px" : "0px",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-center gap-4 px-2 pt-2 border-t border-ink">
          {splits.map((split) => (
            <div key={split.label} className="flex-1 text-center">
              <span className="font-mono text-xs text-fade tracking-wider">
                {split.label}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="pt-8 text-center">
          <p className="font-mono text-sm text-ink tracking-wider">
            Total Cases: {totalCases}
          </p>
        </div>
      </main>

      <TabBar />
    </div>
  );
}
