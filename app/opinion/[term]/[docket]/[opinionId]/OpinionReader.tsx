"use client";

import Link from "next/link";
import TabBar from "../../../../components/TabBar";
import AnnotatableText from "../../../../components/AnnotatableText";

interface OpinionReaderProps {
  term: string;
  docket: string;
  opinionId: string;
  caseName: string;
  opinionLabel: string;
  justiceName: string;
  opinionText: string;
  justiaUrl: string;
}

export default function OpinionReader({
  term,
  docket,
  opinionId,
  caseName,
  opinionLabel,
  justiceName,
  opinionText,
  justiaUrl,
}: OpinionReaderProps) {
  const documentId = `opinion-${opinionId}`;

  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 py-3">
            <Link
              href={`/case/${term}/${docket}`}
              className="font-mono text-xs text-fade tracking-wider active:text-ink transition-colors shrink-0"
            >
              &larr; Back
            </Link>
            <div className="truncate">
              <h1 className="font-serif text-base text-ink italic truncate">
                {caseName}
              </h1>
              <p className="font-mono text-xs text-fade tracking-wider truncate">
                {opinionLabel}
                {justiceName ? ` — ${justiceName}` : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4">
        <section className="pt-6 pb-4">
          <h2 className="font-serif text-2xl text-ink italic leading-tight">
            {opinionLabel}
          </h2>
          {justiceName && (
            <p className="font-mono text-xs text-fade tracking-wider mt-2">
              {justiceName}
            </p>
          )}
        </section>

        <section className="py-4 border-t border-divider">
          {opinionText ? (
            <AnnotatableText documentId={documentId} text={opinionText} />
          ) : (
            <div className="text-center py-12">
              <p className="font-mono text-sm text-fade tracking-wider mb-4">
                Unable to load opinion text.
              </p>
              <a
                href={justiaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
              >
                Read on Justia
              </a>
            </div>
          )}
        </section>

        <section className="py-6 border-t border-divider">
          <a
            href={justiaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
          >
            View on Justia &nearr;
          </a>
        </section>
      </main>

      <TabBar />
    </div>
  );
}
