"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function SearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialQuery) {
      inputRef.current?.focus();
    }
  }, [initialQuery]);

  function handleChange(newValue: string) {
    setValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (newValue.trim()) {
        router.push(`/search?q=${encodeURIComponent(newValue.trim())}`);
      } else {
        router.push("/search");
      }
    }, 350);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pb-3">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by case name, topic, or party..."
          className="w-full bg-transparent border-b border-ink/20 focus:border-ink pb-2 pt-1 font-mono text-sm text-ink placeholder:text-fade/60 outline-none tracking-wider transition-colors"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              router.push("/search");
              inputRef.current?.focus();
            }}
            className="absolute right-0 top-0 p-1 font-mono text-xs text-fade hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
