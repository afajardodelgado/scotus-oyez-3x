"use client";

import { useState } from "react";
import type { AnnotationColor } from "../hooks/useAnnotations";

const COLORS: { value: AnnotationColor; bg: string; ring: string }[] = [
  { value: "yellow", bg: "bg-yellow-200", ring: "ring-yellow-400" },
  { value: "blue", bg: "bg-blue-200", ring: "ring-blue-400" },
  { value: "green", bg: "bg-green-200", ring: "ring-green-400" },
];

interface AnnotationBarProps {
  position: { x: number; y: number } | null;
  isMobile: boolean;
  onHighlight: (color: AnnotationColor) => void;
  onAnnotate: (color: AnnotationColor, note: string) => void;
  onDismiss: () => void;
}

export default function AnnotationBar({
  position,
  isMobile,
  onHighlight,
  onAnnotate,
  onDismiss,
}: AnnotationBarProps) {
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>("yellow");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  if (!position && !isMobile) return null;

  const handleHighlight = () => {
    onHighlight(selectedColor);
    resetState();
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      onAnnotate(selectedColor, noteText.trim());
    } else {
      onHighlight(selectedColor);
    }
    resetState();
  };

  const handleDismiss = () => {
    resetState();
    onDismiss();
  };

  const resetState = () => {
    setShowNoteInput(false);
    setNoteText("");
  };

  if (showNoteInput) {
    return (
      <div
        className={
          isMobile
            ? "fixed bottom-0 left-0 right-0 z-[60] bg-canvas border-t border-divider px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] animate-slide-up"
            : "absolute z-[60] bg-canvas border border-divider shadow-lg px-4 py-3 rounded-lg w-72"
        }
        style={
          !isMobile && position
            ? { left: position.x, top: position.y + 8 }
            : undefined
        }
      >
        <div className="flex items-center gap-2 mb-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setSelectedColor(c.value)}
              className={`w-6 h-6 rounded-full ${c.bg} ${
                selectedColor === c.value ? `ring-2 ${c.ring}` : ""
              }`}
            />
          ))}
        </div>
        <textarea
          autoFocus
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="w-full bg-transparent border border-divider rounded px-3 py-2 font-serif text-sm text-ink resize-none focus:outline-none focus:border-ink"
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={handleDismiss}
            className="font-mono text-xs text-fade tracking-wider px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveNote}
            className="font-mono text-xs text-ink tracking-wider px-3 py-1.5 border border-ink active:bg-ink active:text-canvas transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isMobile
          ? "fixed bottom-0 left-0 right-0 z-[60] bg-canvas border-t border-divider px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] animate-slide-up"
          : "absolute z-[60] bg-canvas border border-divider shadow-lg px-3 py-2 rounded-lg"
      }
      style={
        !isMobile && position
          ? { left: position.x, top: position.y + 8 }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setSelectedColor(c.value);
                onHighlight(c.value);
                resetState();
              }}
              className={`w-6 h-6 rounded-full ${c.bg} active:scale-110 transition-transform`}
            />
          ))}
        </div>
        <div className="w-px h-5 bg-divider" />
        <button
          onClick={() => setShowNoteInput(true)}
          className="font-mono text-xs text-ink tracking-wider px-2 py-1 active:text-fade transition-colors"
        >
          Note
        </button>
        <button
          onClick={handleDismiss}
          className="font-mono text-xs text-fade tracking-wider px-1 py-1"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
