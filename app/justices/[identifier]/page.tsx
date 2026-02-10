export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchJusticeProfile, fetchJusticeTerms } from "../../lib/api";
import { getCurrentTerm } from "../../lib/utils";
import TabBar from "../../components/TabBar";

function DetailTermSelector({
  terms,
  currentTerm,
  identifier,
}: {
  terms: string[];
  currentTerm: string;
  identifier: string;
}) {
  const scotusTerm = getCurrentTerm();
  const allOptions = ["lifetime", ...terms];

  function label(t: string): string {
    if (t === "lifetime") return "Lifetime";
    if (t === scotusTerm) return `Current (${t})`;
    return t;
  }

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-divider">
      {allOptions.map((t) => {
        const isActive = t === currentTerm;
        return (
          <a
            key={t}
            href={`/justices/${identifier}?term=${t}`}
            className={`shrink-0 px-3 py-1.5 font-mono text-xs tracking-wider transition-colors whitespace-nowrap ${
              isActive
                ? "bg-ink text-canvas"
                : "text-fade active:text-ink"
            }`}
          >
            {label(t)}
          </a>
        );
      })}
    </div>
  );
}

export default async function JusticeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ identifier: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { identifier } = await params;
  const sp = await searchParams;
  const currentTerm = sp.term || getCurrentTerm();

  const [profile, terms] = await Promise.all([
    fetchJusticeProfile(identifier, currentTerm),
    fetchJusticeTerms(),
  ]);

  if (!profile) {
    return (
      <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4">
        <p className="font-mono text-sm text-error tracking-wider">
          Justice not found. Retry.
        </p>
        <Link
          href="/justices"
          className="mt-6 px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
        >
          Return to justices
        </Link>
        <TabBar />
      </div>
    );
  }

  const { justice: j, opinions, alignments, dissents } = profile;
  const totalVotes = j.majorityCount + j.dissentCount;
  const majPct = totalVotes > 0 ? Math.round((j.majorityCount / totalVotes) * 100) : 0;
  const disPct = totalVotes > 0 ? Math.round((j.dissentCount / totalVotes) * 100) : 0;
  const yearAppointed = j.dateStart ? new Date(j.dateStart * 1000).getFullYear() : null;
  const termLabel = currentTerm === "lifetime" ? "Lifetime" : `${currentTerm} Term`;

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 py-3">
            <Link
              href={`/justices?term=${currentTerm === "lifetime" ? getCurrentTerm() : currentTerm}`}
              className="font-mono text-xs text-fade tracking-wider active:text-ink transition-colors shrink-0"
            >
              &larr; Back
            </Link>
            <h1 className="font-serif text-base text-ink italic truncate">
              {j.roleTitle.includes("Chief") ? "Chief Justice" : "Justice"} {j.lastName}
            </h1>
          </div>
        </div>
        <Suspense>
          <DetailTermSelector
            terms={terms}
            currentTerm={currentTerm}
            identifier={identifier}
          />
        </Suspense>
      </header>

      <main className="px-4">
        {/* Justice Header */}
        <section className="pt-6 pb-4">
          <div className="flex items-start gap-4">
            {j.thumbnailUrl && (
              <div className="shrink-0 w-16 h-16 bg-fade/10 border border-divider overflow-hidden">
                <Image
                  src={j.thumbnailUrl}
                  alt={j.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
            )}
            <div>
              <h2 className="font-serif text-2xl text-ink italic leading-tight">
                {j.name}
              </h2>
              <p className="mt-1 font-mono text-xs text-fade tracking-wider">
                {j.roleTitle}
              </p>
            </div>
          </div>
        </section>

        {/* Bio Metadata */}
        <section className="py-4 border-t border-divider space-y-2">
          {j.appointingPresident && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-24">
                Appointed by
              </span>
              <span className="font-mono text-xs text-ink tracking-wider">
                {j.appointingPresident}
              </span>
            </div>
          )}
          {yearAppointed && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-24">
                Year
              </span>
              <span className="font-mono text-xs text-ink tracking-wider">
                {yearAppointed}
              </span>
            </div>
          )}
          {j.lawSchool && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-24">
                Law school
              </span>
              <span className="font-mono text-xs text-ink tracking-wider">
                {j.lawSchool}
              </span>
            </div>
          )}
          {j.homeState && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fade tracking-wider w-24">
                Home state
              </span>
              <span className="font-mono text-xs text-ink tracking-wider">
                {j.homeState}
              </span>
            </div>
          )}
        </section>

        {/* Term Record Bar */}
        {totalVotes > 0 && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Voting Record — {termLabel}
            </h3>

            {/* Stat numbers */}
            <div className="flex items-center gap-4 mb-3">
              <div>
                <span className="font-mono text-2xl text-ink">{j.majorityCount}</span>
                <span className="font-mono text-xs text-success tracking-wider ml-1.5">
                  Majority
                </span>
              </div>
              <div>
                <span className="font-mono text-2xl text-ink">{j.dissentCount}</span>
                <span className="font-mono text-xs text-error tracking-wider ml-1.5">
                  Dissent
                </span>
              </div>
              {j.authoredCount > 0 && (
                <div>
                  <span className="font-mono text-2xl text-ink">{j.authoredCount}</span>
                  <span className="font-mono text-xs text-citation tracking-wider ml-1.5">
                    Authored
                  </span>
                </div>
              )}
            </div>

            {/* Visual bar */}
            <div className="flex h-3 w-full overflow-hidden">
              <div
                className="bg-success"
                style={{ width: `${majPct}%` }}
              />
              <div
                className="bg-error"
                style={{ width: `${disPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[10px] text-fade tracking-wider">
                {majPct}% majority
              </span>
              <span className="font-mono text-[10px] text-fade tracking-wider">
                {disPct}% dissent
              </span>
            </div>
          </section>
        )}

        {/* Alignment Chart */}
        {alignments.length > 0 && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Alignment — {termLabel}
            </h3>
            <p className="font-mono text-[10px] text-fade/60 tracking-wider mb-3">
              Non-unanimous cases only
            </p>
            <div className="space-y-2">
              {alignments.map((a) => {
                const pct = Math.round(a.rate * 100);
                const barColor =
                  a.rate >= 0.7
                    ? "bg-success"
                    : a.rate >= 0.4
                      ? "bg-fade/50"
                      : "bg-error/70";
                return (
                  <div key={a.justiceName}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-xs text-ink tracking-wider">
                        {a.justiceName}
                      </span>
                      <span className="font-mono text-xs text-fade tracking-wider">
                        {pct}% ({a.agreed}/{a.total})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-fade/10 overflow-hidden">
                      <div
                        className={`h-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Authored Opinions */}
        {opinions.length > 0 && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Authored Opinions — {termLabel}
            </h3>
            <div className="divide-y divide-divider">
              {opinions.map((o, i) => (
                <Link
                  key={`${o.term}-${o.docketNumber}-${i}`}
                  href={`/case/${o.term}/${o.docketNumber}`}
                  className="block py-3 active:bg-ink/5 transition-colors"
                >
                  <h4 className="font-serif text-sm text-ink italic leading-snug">
                    {o.caseName}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-fade tracking-wider">
                      {o.docketNumber}
                    </span>
                    <span className="font-mono text-xs text-citation tracking-wider">
                      {o.opinionType}
                    </span>
                  </div>
                  {o.description && (
                    <p className="mt-1 font-serif text-xs text-fade leading-relaxed line-clamp-2">
                      {o.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Notable Dissents */}
        {dissents.length > 0 && (
          <section className="py-4 border-t border-divider">
            <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
              Dissents — {termLabel}
            </h3>
            <div className="divide-y divide-divider">
              {dissents.map((d, i) => (
                <Link
                  key={`${d.term}-${d.docketNumber}-${i}`}
                  href={`/case/${d.term}/${d.docketNumber}`}
                  className="block py-3 active:bg-ink/5 transition-colors"
                >
                  <h4 className="font-serif text-sm text-ink italic leading-snug">
                    {d.caseName}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-fade tracking-wider">
                      {d.docketNumber}
                    </span>
                    <span className="font-mono text-xs text-error tracking-wider">
                      Dissent
                    </span>
                  </div>
                  {d.description && (
                    <p className="mt-1 font-serif text-xs text-fade leading-relaxed line-clamp-2">
                      {d.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <TabBar />
    </div>
  );
}
