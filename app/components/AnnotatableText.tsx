"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAnnotations } from "../hooks/useAnnotations";
import { useAnnotationMode } from "./AnnotationToggle";
import AnnotationToggle from "./AnnotationToggle";
import AnnotationBar from "./AnnotationBar";
import AnnotationNote from "./AnnotationNote";
import type { AnnotationColor, Annotation } from "../hooks/useAnnotations";

interface AnnotatableTextProps {
  documentId: string;
  text: string;
  title?: string;
}

interface SelectionState {
  text: string;
  startOffset: number;
  endOffset: number;
  position: { x: number; y: number };
}

interface TextSegment {
  text: string;
  start: number;
  end: number;
  annotations: Annotation[];
}

function computeSegments(
  text: string,
  annotations: Annotation[]
): TextSegment[] {
  if (annotations.length === 0) {
    return [{ text, start: 0, end: text.length, annotations: [] }];
  }

  // Collect all boundary points
  const points = new Set<number>();
  points.add(0);
  points.add(text.length);

  for (const ann of annotations) {
    const start = Math.max(0, Math.min(ann.startOffset, text.length));
    const end = Math.max(0, Math.min(ann.endOffset, text.length));
    points.add(start);
    points.add(end);
  }

  const sorted = Array.from(points).sort((a, b) => a - b);
  const segments: TextSegment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;

    const covering = annotations.filter(
      (a) => a.startOffset <= start && a.endOffset >= end
    );

    segments.push({
      text: text.slice(start, end),
      start,
      end,
      annotations: covering,
    });
  }

  return segments;
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-200/70",
  blue: "bg-blue-200/70",
  green: "bg-green-200/70",
};

export default function AnnotatableText({
  documentId,
  text,
  title,
}: AnnotatableTextProps) {
  const {
    annotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    exportAnnotations,
  } = useAnnotations(documentId);
  const { enabled, toggle, loaded } = useAnnotationMode();

  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(
    null
  );
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getTextOffset = useCallback(
    (node: Node, offsetInNode: number): number => {
      const container = containerRef.current;
      if (!container) return 0;

      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      let offset = 0;
      let current = walker.nextNode();
      while (current) {
        if (current === node) {
          return offset + offsetInNode;
        }
        offset += current.textContent?.length || 0;
        current = walker.nextNode();
      }
      return offset;
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    if (!enabled) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer))
      return;

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    const startOffset = getTextOffset(range.startContainer, range.startOffset);
    const endOffset = getTextOffset(range.endContainer, range.endOffset);

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setSelection({
      text: selectedText,
      startOffset,
      endOffset,
      position: {
        x: Math.min(
          rect.left - containerRect.left,
          containerRect.width - 200
        ),
        y: rect.bottom - containerRect.top,
      },
    });
    setActiveAnnotation(null);
  }, [enabled, getTextOffset]);

  const handleHighlight = useCallback(
    (color: AnnotationColor) => {
      if (!selection) return;
      addAnnotation({
        documentId,
        selectedText: selection.text,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        note: "",
        color,
      });
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, addAnnotation, documentId]
  );

  const handleAnnotate = useCallback(
    (color: AnnotationColor, note: string) => {
      if (!selection) return;
      addAnnotation({
        documentId,
        selectedText: selection.text,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        note,
        color,
      });
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, addAnnotation, documentId]
  );

  const handleDismissBar = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  const handleHighlightClick = useCallback(
    (ann: Annotation) => {
      if (!enabled) return;
      setActiveAnnotation((prev) => (prev?.id === ann.id ? null : ann));
      setSelection(null);
    },
    [enabled]
  );

  const segments = computeSegments(text, annotations);

  // Collect annotations that have notes to show inline below their highlights
  const annotationsWithNotes = annotations.filter((a) => a.note);

  if (!loaded) return null;

  return (
    <div className="relative">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-xs text-fade tracking-widest uppercase">
            {title}
          </h3>
          <AnnotationToggle
            enabled={enabled}
            onToggle={toggle}
            onExport={() => exportAnnotations()}
            annotationCount={annotations.length}
          />
        </div>
      )}

      {!title && (
        <div className="flex justify-end mb-4">
          <AnnotationToggle
            enabled={enabled}
            onToggle={toggle}
            onExport={() => exportAnnotations()}
            annotationCount={annotations.length}
          />
        </div>
      )}

      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        className="font-serif text-base text-ink leading-[1.7] whitespace-pre-line relative"
      >
        {segments.map((seg, i) => {
          const hasAnnotation = seg.annotations.length > 0;
          if (!hasAnnotation) {
            return <span key={i}>{seg.text}</span>;
          }

          const topAnn = seg.annotations[seg.annotations.length - 1];
          return (
            <mark
              key={i}
              className={`${HIGHLIGHT_COLORS[topAnn.color] || HIGHLIGHT_COLORS.yellow} cursor-pointer rounded-sm`}
              onClick={() => handleHighlightClick(topAnn)}
            >
              {seg.text}
            </mark>
          );
        })}
      </div>

      {/* Inline notes below highlighted text */}
      {activeAnnotation && (
        <AnnotationNote
          annotation={activeAnnotation}
          onUpdate={(id, note) => {
            updateAnnotation(id, { note });
            setActiveAnnotation((prev) =>
              prev?.id === id ? { ...prev, note } : prev
            );
          }}
          onDelete={(id) => {
            removeAnnotation(id);
            setActiveAnnotation(null);
          }}
          onDismiss={() => setActiveAnnotation(null)}
        />
      )}

      {/* Show persistent inline notes for annotations with notes */}
      {annotationsWithNotes
        .filter((a) => a.id !== activeAnnotation?.id)
        .map((ann) => (
          <div
            key={ann.id}
            className="border-l-2 px-3 py-1.5 my-1 rounded-r cursor-pointer"
            style={{
              borderLeftColor:
                ann.color === "yellow"
                  ? "#facc15"
                  : ann.color === "blue"
                    ? "#60a5fa"
                    : "#4ade80",
            }}
            onClick={() => handleHighlightClick(ann)}
          >
            <p className="font-serif text-xs text-fade italic line-clamp-1">
              &ldquo;{ann.selectedText.slice(0, 60)}
              {ann.selectedText.length > 60 ? "..." : ""}&rdquo;
            </p>
            <p className="font-serif text-sm text-ink leading-snug">
              {ann.note}
            </p>
          </div>
        ))}

      {/* Selection action bar */}
      {selection && enabled && (
        <AnnotationBar
          position={selection.position}
          isMobile={isMobile}
          onHighlight={handleHighlight}
          onAnnotate={handleAnnotate}
          onDismiss={handleDismissBar}
        />
      )}
    </div>
  );
}
