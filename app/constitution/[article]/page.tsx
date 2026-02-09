import Link from "next/link";
import { fetchConstitutionArticle } from "../../lib/api";
import TabBar from "../../components/TabBar";

export default async function ConstitutionArticlePage({
  params,
}: {
  params: Promise<{ article: string }>;
}) {
  const { article } = await params;
  const decoded = decodeURIComponent(article);
  const sections = await fetchConstitutionArticle(decoded);

  if (sections.length === 0) {
    return (
      <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4">
        <p className="font-mono text-sm text-error tracking-wider">
          Article not found.
        </p>
        <Link
          href="/constitution"
          className="mt-6 px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
        >
          Return to Constitution
        </Link>
        <TabBar />
      </div>
    );
  }

  const first = sections[0];
  const title =
    decoded === "Preamble"
      ? "Preamble"
      : decoded.startsWith("Amdt.")
        ? `Amendment ${decoded.replace("Amdt. ", "")}`
        : `Article ${decoded}`;

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 py-3">
            <Link
              href="/constitution"
              className="font-mono text-xs text-fade tracking-wider active:text-ink transition-colors shrink-0"
            >
              &larr; Back
            </Link>
            <h1 className="font-serif text-base text-ink italic truncate">
              {title}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4">
        <section className="pt-6 pb-4">
          <h2 className="font-serif text-2xl text-ink italic leading-tight">
            {title}
          </h2>
          <p className="font-mono text-xs text-fade tracking-wider mt-2">
            {first.article_title}
          </p>
        </section>

        {sections.map((s) => (
          <section key={s.id} className="py-4 border-t border-divider">
            {s.section_number && (
              <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
                Section {s.section_number}
                {s.section_title && ` — ${s.section_title}`}
              </h3>
            )}
            <div className="font-serif text-base text-ink leading-[1.7] whitespace-pre-line">
              {s.text}
            </div>
          </section>
        ))}
      </main>

      <TabBar />
    </div>
  );
}
