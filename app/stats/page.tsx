import { Suspense } from "react";
import Link from "next/link";
import { fetchTermStats, fetchAvailableTerms, fetchJusticeAgreement } from "../lib/api";
import TermSelector from "../components/TermSelector";
import TabBar from "../components/TabBar";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const params = await searchParams;
  const currentTerm = params.term || "2023";
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
            Total Cases Decided: {totalCases}
          </p>
        </div>

        {/* Justice Agreement Matrix */}
        {agreement.justices.length > 0 && (
          <section className="pt-10 pb-6">
            <div className="text-center pb-4">
              <h2 className="font-serif text-lg text-ink">
                Justice Agreement ({currentTerm})
              </h2>
              <p className="font-mono text-xs text-fade tracking-wider mt-1">
                {agreement.caseCount} non-unanimous cases
              </p>
            </div>

            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full border-collapse" style={{ minWidth: `${agreement.justices.length * 44 + 72}px` }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-canvas z-10" />
                    {agreement.justices.map((j) => (
                      <th key={j} className="font-mono text-[10px] text-fade tracking-wider py-2 px-1 text-center" style={{ minWidth: "40px" }}>
                        <span className="inline-block" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>
                          {j}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agreement.justices.map((j1) => (
                    <tr key={j1}>
                      <td className="sticky left-0 bg-canvas z-10 font-mono text-[10px] text-fade tracking-wider pr-2 py-1 text-right whitespace-nowrap">
                        {j1}
                      </td>
                      {agreement.justices.map((j2) => {
                        const cell = agreement.matrix[j1]?.[j2];
                        const rate = cell?.rate ?? 0;
                        const pct = Math.round(rate * 100);
                        const isDiagonal = j1 === j2;

                        // Color scale: low agreement = light, high = dark
                        const opacity = isDiagonal ? 0 : Math.max(0.05, rate);
                        const bg = isDiagonal
                          ? "transparent"
                          : rate >= 0.7
                            ? `rgba(74, 93, 35, ${opacity})`
                            : rate >= 0.4
                              ? `rgba(136, 136, 136, ${opacity * 0.8})`
                              : `rgba(158, 42, 43, ${opacity})`;

                        return (
                          <td
                            key={j2}
                            className="text-center py-1 px-1"
                            style={{
                              backgroundColor: bg,
                              minWidth: "40px",
                            }}
                          >
                            {!isDiagonal && cell?.total > 0 && (
                              <span
                                className={`font-mono text-[10px] ${
                                  rate >= 0.7 && opacity > 0.5
                                    ? "text-canvas"
                                    : rate < 0.4 && opacity > 0.3
                                      ? "text-canvas"
                                      : "text-ink"
                                }`}
                              >
                                {pct}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: "rgba(158, 42, 43, 0.4)" }} />
                <span className="font-mono text-[10px] text-fade tracking-wider">Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: "rgba(136, 136, 136, 0.5)" }} />
                <span className="font-mono text-[10px] text-fade tracking-wider">Mid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: "rgba(74, 93, 35, 0.7)" }} />
                <span className="font-mono text-[10px] text-fade tracking-wider">High</span>
              </div>
            </div>
          </section>
        )}
      </main>

      <TabBar />
    </div>
  );
}
