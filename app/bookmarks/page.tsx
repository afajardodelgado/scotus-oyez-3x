import TabBar from "../components/TabBar";
import BookmarksList from "./BookmarksList";

export default function BookmarksPage() {
  return (
    <div className="min-h-dvh bg-canvas pb-16">
      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-sm border-b border-divider">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="py-3">
            <h1 className="font-serif text-xl text-ink">Bookmarks</h1>
          </div>
        </div>
      </header>
      <main>
        <BookmarksList />
      </main>
      <TabBar />
    </div>
  );
}
