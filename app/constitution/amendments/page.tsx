import Link from "next/link";
import { fetchConstitutionArticles } from "../../lib/api";
import TabBar from "../../components/TabBar";
import HeaderMenu from "../../components/HeaderMenu";
import { amendmentSummaries } from "../amendmentSummaries";

export default async function AmendmentsPage() {
  const allArticles = await fetchConstitutionArticles();
  const amendments = allArticles.filter((a) => a.article.startsWith("Amdt."));

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <HeaderMenu current="/constitution/amendments" />
          </div>
        </div>
      </header>

      <main>
        <div className="divide-y divide-divider">
          {amendments.map((a) => {
            const num = a.article.replace("Amdt. ", "");
            const summary = amendmentSummaries[a.article] || "";

            return (
              <Link
                key={a.article}
                href={`/constitution/${encodeURIComponent(a.article)}`}
                className="block px-4 py-5 active:bg-ink/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-1.5">
                    <div className="w-3.5 h-3.5 border border-success bg-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-lg leading-snug text-ink italic">
                      Amendment {num}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-xs text-fade tracking-wider">
                        {a.article_title}
                      </span>
                      {a.section_count > 1 && (
                        <span className="font-mono text-xs text-fade tracking-wider">
                          {a.section_count} sections
                        </span>
                      )}
                    </div>
                    {summary && (
                      <p className="mt-2 font-serif text-sm text-fade leading-relaxed line-clamp-2">
                        {summary}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <TabBar />
    </div>
  );
}
