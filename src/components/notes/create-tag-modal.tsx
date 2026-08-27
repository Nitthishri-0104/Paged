"use client";

import { useState, type FormEvent } from "react";
import { TAG_COLOR_PRESETS, DEFAULT_TAG_COLOR_KEY, type TagColorKey } from "@/lib/notes/tag-colors";
import { ApiClientError } from "@/lib/api-client";

export function CreateTagModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, color: TagColorKey) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColorKey>(DEFAULT_TAG_COLOR_KEY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate(trimmed, color);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create tag");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-tag-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="create-tag-title" className="text-lg font-semibold text-stone-900">
            Create New Tag
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="tag-name" className="block text-sm font-medium text-stone-700">
              Tag Name
            </label>
            <input
              id="tag-name"
              type="text"
              autoFocus
              required
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter tag name..."
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus-visible:border-teal-600"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-stone-700">Choose Color</legend>
            <div role="radiogroup" aria-label="Tag color" className="mt-2 flex flex-wrap gap-2">
              {TAG_COLOR_PRESETS.map((preset) => {
                const isSelected = preset.key === color;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={preset.label}
                    onClick={() => setColor(preset.key)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${preset.swatch} ${
                      isSelected ? "ring-2 ring-offset-2 ring-stone-400" : ""
                    }`}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 text-white" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Tag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
