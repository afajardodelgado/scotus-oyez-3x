import { searchCases } from "../lib/api";
import CaseListItem from "../components/CaseListItem";
import TabBar from "../components/TabBar";
import SearchInput from "./SearchInput";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const results = query ? await searchCases(query) : [];

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
        {query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="font-mono text-sm text-fade tracking-wider">
              No cases found for &ldquo;{query}&rdquo;.
            </p>
          </div>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="font-mono text-sm text-fade tracking-wider">
              Search by case name, topic, or party.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="px-4 py-2">
              <span className="font-mono text-xs text-fade tracking-wider">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y divide-divider">
              {results.map((c) => (
                <CaseListItem key={c.id} case={c} />
              ))}
            </div>
          </>
        )}
      </main>

      <TabBar />
    </div>
  );
}
