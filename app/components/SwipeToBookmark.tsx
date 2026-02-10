"use client";

import { useRef, useState, useCallback } from "react";
import { useBookmarks, type Bookmark } from "../hooks/useBookmarks";

function BookmarkFlag() {
  return (
    <div className="absolute top-0 right-3 z-10">
      <svg width="16" height="22" viewBox="0 0 16 22" fill="currentColor" className="text-ink">
        <path d="M0 0h16v22l-8-5-8 5V0z" />
      </svg>
    </div>
  );
}

export default function SwipeToBookmark({
  bookmark,
  children,
}: {
  bookmark: Omit<Bookmark, "addedAt">;
  children: React.ReactNode;
}) {
  const { toggle, isBookmarked } = useBookmarks();
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const bookmarked = isBookmarked(bookmark.id);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startXRef.current;
    // Only allow left swipe (negative dx), capped at -80
    const clamped = Math.min(0, Math.max(-80, dx));
    currentXRef.current = clamped;
    setOffset(clamped);
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    // If swiped past threshold, toggle bookmark
    if (currentXRef.current < -40) {
      toggle(bookmark);
    }
    setOffset(0);
  }, [toggle, bookmark]);

  return (
    <div className="relative overflow-hidden">
      {/* Bookmark action revealed behind */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-ink">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-canvas">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {/* Slideable content */}
      <div
        ref={containerRef}
        className="relative bg-canvas"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {bookmarked && <BookmarkFlag />}
        {children}
      </div>
    </div>
  );
}
