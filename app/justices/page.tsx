export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchJustices, fetchJusticeTerms } from "../lib/api";
import { getCurrentTerm } from "../lib/utils";
import SwipeToBookmark from "../components/SwipeToBookmark";
import TermSelector from "../components/TermSelector";
import TabBar from "../components/TabBar";
import HeaderMenu from "../components/HeaderMenu";

export default async function JusticesPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const params = await searchParams;
  const currentTerm = params.term || getCurrentTerm();
  const [justices, terms] = await Promise.all([
    fetchJustices(currentTerm),
    fetchJusticeTerms(),
  ]);

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 py-3">
            <HeaderMenu current="/justices" />
          </div>
        </div>
        <Suspense>
          <TermSelector
            terms={terms}
            currentTerm={currentTerm}
            baseUrl="/justices"
            actualCurrentTerm={getCurrentTerm()}
          />
        </Suspense>
      </header>

      <main className="divide-y divide-divider">
        {justices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="font-mono text-sm text-fade tracking-wider">
              No justice data available for this term.
            </p>
          </div>
        )}

        {justices.map((j) => {
          const yearAppointed = j.dateStart
            ? new Date(j.dateStart * 1000).getFullYear()
            : null;
          const totalVotes = j.majorityCount + j.dissentCount;

          return (
            <SwipeToBookmark
              key={j.identifier}
              bookmark={{
                id: `justice-${j.identifier}`,
                type: "justice",
                title: `${j.roleTitle.includes("Chief") ? "Chief Justice" : "Justice"} ${j.lastName}`,
                subtitle: j.appointingPresident,
                href: `/justices/${j.identifier}?term=${currentTerm}`,
              }}
            >
            <Link
              href={`/justices/${j.identifier}?term=${currentTerm}`}
              className="block px-4 py-5 active:bg-ink/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="shrink-0 w-12 h-12 bg-fade/10 border border-divider overflow-hidden">
                  {j.thumbnailUrl ? (
                    <Image
                      src={j.thumbnailUrl}
                      alt={j.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover grayscale"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-mono text-xs text-fade">
                        {j.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Name */}
                  <h2 className="font-serif text-lg leading-snug text-ink italic">
                    {j.roleTitle.includes("Chief") ? "Chief Justice" : "Justice"}{" "}
                    {j.lastName}
                  </h2>

                  {/* Bio line */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {j.appointingPresident && (
                      <span className="font-mono text-xs text-fade tracking-wider">
                        {j.appointingPresident}
                      </span>
                    )}
                    {yearAppointed && (
                      <span className="font-mono text-xs text-fade tracking-wider">
                        {yearAppointed}
                      </span>
                    )}
                    {j.lawSchool && (
                      <span className="font-mono text-xs text-fade tracking-wider">
                        {j.lawSchool}
                      </span>
                    )}
                  </div>

                  {/* Term stats */}
                  {totalVotes > 0 && (
                    <div className="mt-1.5 flex items-center gap-x-3">
                      <span className="font-mono text-xs text-success tracking-wider">
                        Maj: {j.majorityCount}
                      </span>
                      <span className="font-mono text-xs text-error tracking-wider">
                        Dis: {j.dissentCount}
                      </span>
                      {j.authoredCount > 0 && (
                        <span className="font-mono text-xs text-citation tracking-wider">
                          Auth: {j.authoredCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
            </SwipeToBookmark>
          );
        })}
      </main>

      <TabBar />
    </div>
  );
}
