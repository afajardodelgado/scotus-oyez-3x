"use client";

import Link from "next/link";
import { useBookmarks, type Bookmark } from "../hooks/useBookmarks";

const typeLabels: Record<Bookmark["type"], string> = {
  case: "Cases",
  justice: "Justices",
  constitution: "Constitution",
  amendment: "Amendments",
};

const typeOrder: Bookmark["type"][] = ["case", "justice", "constitution", "amendment"];

export default function BookmarksList() {
  const { bookmarks, remove, loaded } = useBookmarks();

  if (!loaded) return null;

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <p className="font-mono text-sm text-fade tracking-wider">
          No bookmarks saved.
        </p>
        <p className="mt-2 font-mono text-xs text-fade/60 tracking-wider">
          Swipe left on any item to bookmark it.
        </p>
      </div>
    );
  }

  // Group by type
  const grouped = new Map<Bookmark["type"], Bookmark[]>();
  for (const b of bookmarks) {
    if (!grouped.has(b.type)) grouped.set(b.type, []);
    grouped.get(b.type)!.push(b);
  }

  return (
    <div>
      {typeOrder.map((type) => {
        const items = grouped.get(type);
        if (!items || items.length === 0) return null;

        return (
          <section key={type}>
            <div className="px-4 py-2 bg-canvas border-b border-divider">
              <h2 className="font-mono text-xs text-fade tracking-widest uppercase">
                {typeLabels[type]} ({items.length})
              </h2>
            </div>
            <div className="divide-y divide-divider">
              {items
                .sort((a, b) => b.addedAt - a.addedAt)
                .map((b) => (
                  <div key={b.id} className="flex items-center">
                    <Link
                      href={b.href}
                      className="flex-1 block px-4 py-4 active:bg-ink/5 transition-colors"
                    >
                      <h3 className="font-serif text-base text-ink italic leading-snug">
                        {b.title}
                      </h3>
                      {b.subtitle && (
                        <p className="mt-0.5 font-mono text-xs text-fade tracking-wider">
                          {b.subtitle}
                        </p>
                      )}
                    </Link>
                    <button
                      onClick={() => remove(b.id)}
                      className="shrink-0 px-4 py-4 active:opacity-50 transition-opacity"
                      aria-label="Remove bookmark"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-ink">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
