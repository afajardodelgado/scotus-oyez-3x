"use client";

import { useState } from "react";
import type { Annotation } from "../hooks/useAnnotations";

interface AnnotationNoteProps {
  annotation: Annotation;
  onUpdate: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onDismiss: () => void;
}

const COLOR_STYLES: Record<string, string> = {
  yellow: "border-l-yellow-400 bg-yellow-50",
  blue: "border-l-blue-400 bg-blue-50",
  green: "border-l-green-400 bg-green-50",
};

export default function AnnotationNote({
  annotation,
  onUpdate,
  onDelete,
  onDismiss,
}: AnnotationNoteProps) {
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState(annotation.note);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    onUpdate(annotation.id, noteText.trim());
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(annotation.id);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div
      className={`border-l-2 ${COLOR_STYLES[annotation.color] || COLOR_STYLES.yellow} px-3 py-2 my-2 rounded-r`}
    >
      <p className="font-serif text-xs text-fade italic leading-snug mb-1.5 line-clamp-2">
        &ldquo;{annotation.selectedText}&rdquo;
      </p>

      {editing ? (
        <div>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
            className="w-full bg-transparent border border-divider rounded px-2 py-1.5 font-serif text-sm text-ink resize-none focus:outline-none focus:border-ink"
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onClick={() => {
                setNoteText(annotation.note);
                setEditing(false);
              }}
              className="font-mono text-xs text-fade tracking-wider px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="font-mono text-xs text-ink tracking-wider px-2 py-1 border border-ink active:bg-ink active:text-canvas transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          {annotation.note && (
            <p className="font-serif text-sm text-ink leading-snug">
              {annotation.note}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => setEditing(true)}
              className="font-mono text-xs text-citation tracking-wider"
            >
              {annotation.note ? "Edit" : "Add note"}
            </button>
            <button
              onClick={handleDelete}
              className="font-mono text-xs text-error tracking-wider"
            >
              {confirmDelete ? "Confirm" : "Delete"}
            </button>
            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                className="font-mono text-xs text-fade tracking-wider"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onDismiss}
              className="font-mono text-xs text-fade tracking-wider ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
