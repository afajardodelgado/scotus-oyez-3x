"use client";

import { useState, useEffect, useCallback } from "react";

export interface Bookmark {
  id: string;
  type: "case" | "justice" | "constitution" | "amendment";
  title: string;
  subtitle?: string;
  href: string;
  addedAt: number;
}

const STORAGE_KEY = "scotus-bookmarks";

function loadBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // localStorage full or unavailable
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBookmarks(loadBookmarks());
    setLoaded(true);
  }, []);

  const toggle = useCallback((bookmark: Omit<Bookmark, "addedAt">) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === bookmark.id);
      const next = exists
        ? prev.filter((b) => b.id !== bookmark.id)
        : [...prev, { ...bookmark, addedAt: Date.now() }];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  const remove = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  return { bookmarks, toggle, isBookmarked, remove, loaded };
}
