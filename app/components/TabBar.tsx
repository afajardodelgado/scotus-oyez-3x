"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Recent", href: "/" },
  { label: "Search", href: "/search" },
  { label: "Bookmarks", href: "/bookmarks" },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-divider z-50">
      <div className="flex items-center justify-around h-12 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/" || pathname.startsWith("/case")
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex items-center justify-center h-full px-4
                font-mono text-xs tracking-wider uppercase
                transition-colors
                ${isActive ? "text-ink" : "text-fade"}
              `}
            >
              {isActive ? `[ ${tab.label} ]` : tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
