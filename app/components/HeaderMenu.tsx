"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const pages = [
  { label: "Supreme Court Cases", href: "/" },
  { label: "The Constitution", href: "/constitution" },
  { label: "Constitutional Amendments", href: "/constitution/amendments" },
  { label: "Declaration of Independence", href: "/declaration" },
];

export default function HeaderMenu({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentPage = pages.find((p) => p.href === current) || pages[0];
  const otherPages = pages.filter((p) => p.href !== current);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
      >
        <h1 className="font-serif text-xl text-ink">{currentPage.label}</h1>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-ink transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-canvas border border-ink z-50 min-w-[280px]">
          {otherPages.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 font-serif text-lg text-ink active:bg-ink active:text-canvas transition-colors"
            >
              {p.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
