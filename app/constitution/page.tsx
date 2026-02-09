import Link from "next/link";
import { fetchConstitutionArticles } from "../lib/api";
import TabBar from "../components/TabBar";
import HeaderMenu from "../components/HeaderMenu";

const articleSummaries: Record<string, string> = {
  Preamble:
    "Declares the purpose of the Constitution: to form a more perfect union, establish justice, ensure domestic tranquility, provide for defense, promote welfare, and secure liberty.",
  I: "Establishes Congress as the legislative branch, defines the House and Senate, sets election rules, and enumerates the powers and limits of federal lawmaking.",
  II: "Creates the executive branch, defines presidential powers, election procedures, qualifications, and the grounds for impeachment.",
  III: "Establishes the Supreme Court and federal judiciary, defines jurisdiction over constitutional cases, and narrowly defines treason.",
  IV: "Governs relations between states, including full faith and credit, citizen privileges, extradition, and the admission of new states.",
  V: "Sets out the process for amending the Constitution, requiring supermajorities in Congress and ratification by three-fourths of the states.",
  VI: "Establishes the Constitution as the supreme law of the land, requires oaths of office, and prohibits religious tests for public office.",
  VII: "Specifies that ratification by nine of the thirteen original states was sufficient to establish the Constitution.",
};

export default async function ConstitutionPage() {
  const allArticles = await fetchConstitutionArticles();
  const articles = allArticles.filter((a) => !a.article.startsWith("Amdt."));

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <HeaderMenu current="/constitution" />
          </div>
        </div>
      </header>

      <main>
        <div className="divide-y divide-divider">
          {articles.map((a) => {
            const title =
              a.article === "Preamble"
                ? "Preamble"
                : `Article ${a.article}`;
            const summary = articleSummaries[a.article] || "";

            return (
              <Link
                key={a.article}
                href={`/constitution/${encodeURIComponent(a.article)}`}
                className="block px-4 py-5 active:bg-ink/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-1.5">
                    <div className="w-3.5 h-3.5 border border-[#4A5D23] bg-[#4A5D23]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-lg leading-snug text-ink italic">
                      {title}
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
