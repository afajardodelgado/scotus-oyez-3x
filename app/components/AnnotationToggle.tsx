"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "scotus-annotations-enabled";

export function useAnnotationMode() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setEnabled(stored === "true");
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { enabled, toggle, loaded };
}

interface AnnotationToggleProps {
  enabled: boolean;
  onToggle: () => void;
  onExport?: () => void;
  annotationCount?: number;
}

export default function AnnotationToggle({
  enabled,
  onToggle,
  onExport,
  annotationCount = 0,
}: AnnotationToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        className={`font-mono text-xs tracking-wider px-2.5 py-1 border transition-colors ${
          enabled
            ? "border-ink bg-ink text-canvas"
            : "border-divider text-fade active:text-ink"
        }`}
      >
        Annotations{enabled ? ": ON" : ""}
      </button>
      {enabled && annotationCount > 0 && onExport && (
        <button
          onClick={onExport}
          className="font-mono text-xs text-citation tracking-wider active:text-ink transition-colors"
        >
          Export ({annotationCount})
        </button>
      )}
    </div>
  );
}
