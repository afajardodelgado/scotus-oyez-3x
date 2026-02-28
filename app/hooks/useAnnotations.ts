"use client";

import { useState, useEffect, useCallback } from "react";

export type AnnotationColor = "yellow" | "blue" | "green";

export interface Annotation {
  id: string;
  documentId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  note: string;
  color: AnnotationColor;
  createdAt: number;
}

const STORAGE_KEY = "scotus-annotations";

function loadAnnotations(): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAnnotations(annotations: Annotation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch {
    // localStorage full or unavailable
  }
}

export function useAnnotations(documentId: string) {
  const [allAnnotations, setAllAnnotations] = useState<Annotation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAllAnnotations(loadAnnotations());
    setLoaded(true);
  }, []);

  const annotations = allAnnotations.filter(
    (a) => a.documentId === documentId
  );

  const addAnnotation = useCallback(
    (ann: Omit<Annotation, "id" | "createdAt">) => {
      setAllAnnotations((prev) => {
        const next = [
          ...prev,
          { ...ann, id: crypto.randomUUID(), createdAt: Date.now() },
        ];
        saveAnnotations(next);
        return next;
      });
    },
    []
  );

  const removeAnnotation = useCallback((id: string) => {
    setAllAnnotations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAnnotations(next);
      return next;
    });
  }, []);

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Pick<Annotation, "note" | "color">>) => {
      setAllAnnotations((prev) => {
        const next = prev.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        );
        saveAnnotations(next);
        return next;
      });
    },
    []
  );

  const exportAnnotations = useCallback(
    (filename?: string) => {
      const data = allAnnotations.filter((a) => a.documentId === documentId);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `${documentId}-annotations.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [allAnnotations, documentId]
  );

  return {
    annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    exportAnnotations,
    loaded,
  };
}
