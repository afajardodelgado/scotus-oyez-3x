import Link from "next/link";
import Image from "next/image";
import { searchCases, searchJustices, searchConstitution } from "../lib/api";
import CaseListItem from "../components/CaseListItem";
import SwipeToBookmark from "../components/SwipeToBookmark";
import TabBar from "../components/TabBar";
import SearchInput from "./SearchInput";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  const [caseResults, justiceResults, constitutionResults] = query
    ? await Promise.all([
        searchCases(query),
        searchJustices(query),
        searchConstitution(query),
      ])
    : [[], [], []];

  const totalResults = caseResults.length + justiceResults.length + constitutionResults.length;

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="py-3">
            <h1 className="font-serif text-xl text-ink">Search</h1>
          </div>
          <SearchInput initialQuery={query} />
        </div>
      </header>

      <main>
        {query && totalResults === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="font-mono text-sm text-fade tracking-wider">
              No results found for &ldquo;{query}&rdquo;.
            </p>
          </div>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="font-mono text-sm text-fade tracking-wider">
              Search cases, justices, and the Constitution.
            </p>
          </div>
        )}

        {/* Cases */}
        {caseResults.length > 0 && (
          <section>
            <div className="px-4 py-2 border-b border-divider">
              <span className="font-mono text-xs text-fade tracking-widest uppercase">
                Cases ({caseResults.length})
              </span>
            </div>
            <div className="divide-y divide-divider">
              {caseResults.map((c) => (
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
          </section>
        )}

        {/* Justices */}
        {justiceResults.length > 0 && (
          <section>
            <div className="px-4 py-2 border-b border-divider">
              <span className="font-mono text-xs text-fade tracking-widest uppercase">
                Justices ({justiceResults.length})
              </span>
            </div>
            <div className="divide-y divide-divider">
              {justiceResults.map((j) => (
                <SwipeToBookmark
                  key={j.identifier}
                  bookmark={{
                    id: `justice-${j.identifier}`,
                    type: "justice",
                    title: j.name,
                    subtitle: j.appointingPresident,
                    href: `/justices/${j.identifier}`,
                  }}
                >
                  <Link
                    href={`/justices/${j.identifier}`}
                    className="flex items-center gap-3 px-4 py-4 active:bg-ink/5 transition-colors"
                  >
                    {j.thumbnailUrl ? (
                      <div className="shrink-0 w-10 h-10 bg-fade/10 border border-divider overflow-hidden">
                        <Image
                          src={j.thumbnailUrl}
                          alt={j.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                    ) : (
                      <div className="shrink-0 w-10 h-10 bg-fade/10 border border-divider flex items-center justify-center">
                        <span className="font-mono text-xs text-fade">{j.lastName.charAt(0)}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base text-ink italic leading-snug">
                        {j.name}
                      </h3>
                      <p className="mt-0.5 font-mono text-xs text-fade tracking-wider">
                        {j.roleTitle}
                      </p>
                    </div>
                  </Link>
                </SwipeToBookmark>
              ))}
            </div>
          </section>
        )}

        {/* Constitution & Amendments */}
        {constitutionResults.length > 0 && (
          <section>
            <div className="px-4 py-2 border-b border-divider">
              <span className="font-mono text-xs text-fade tracking-widest uppercase">
                Constitution ({constitutionResults.length})
              </span>
            </div>
            <div className="divide-y divide-divider">
              {constitutionResults.map((r, i) => (
                <SwipeToBookmark
                  key={`${r.article}-${i}`}
                  bookmark={{
                    id: r.article.startsWith("Amdt.") ? `amendment-${r.article}` : `constitution-${r.article}`,
                    type: r.article.startsWith("Amdt.") ? "amendment" : "constitution",
                    title: r.title,
                    subtitle: r.section,
                    href: r.href,
                  }}
                >
                  <Link
                    href={r.href}
                    className="block px-4 py-4 active:bg-ink/5 transition-colors"
                  >
                    <h3 className="font-serif text-base text-ink italic leading-snug">
                      {r.title}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-fade tracking-wider">
                      {r.section}
                    </p>
                    <p className="mt-1 font-serif text-xs text-fade leading-relaxed line-clamp-2">
                      {r.snippet}
                    </p>
                  </Link>
                </SwipeToBookmark>
              ))}
            </div>
          </section>
        )}
      </main>

      <TabBar />
    </div>
  );
}
