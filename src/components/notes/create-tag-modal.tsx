"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { TAG_COLOR_PRESETS, DEFAULT_TAG_COLOR_KEY, type TagColorKey } from "@/lib/notes/tag-colors";
import { ApiClientError } from "@/lib/api-client";

/**
 * Built on the native `<dialog>` element (opened via `showModal()`) rather
 * than a hand-rolled `role="dialog"` overlay, specifically to get focus
 * trapping, Escape-to-close, and focus restoration to the triggering
 * element for free from the browser instead of reimplementing them:
 * - Tabbing is natively confined to the dialog's contents while open.
 * - Escape fires the dialog's `cancel` event, which closes it by default.
 * - Calling `close()` (rather than just unmounting) restores focus to
 *   whatever had focus before `showModal()` was called — the sidebar's
 *   "+ New Tag" button — which is why every close path below calls
 *   `dialogRef.current?.close()` instead of `onClose()` directly; the
 *   `close` event listener is what actually notifies the parent.
 */
export function CreateTagModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, color: TagColorKey) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColorKey>(DEFAULT_TAG_COLOR_KEY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // showModal()'s own native autofocus search only honors a real
    // `autofocus` HTML attribute, not React's `autoFocus` prop (which just
    // calls `.focus()` once at mount, too early to matter here since the
    // dialog isn't shown yet at that point) — so it lands on the first
    // focusable element instead (the close button). Focus the name input
    // explicitly right after showing the dialog to get the field editable
    // to editable-immediately behavior this input is meant to have.
    nameInputRef.current?.focus();
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate(trimmed, color);
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create tag");
      setIsSubmitting(false);
    }
  }

  // A click that lands on the dialog element itself (its ::backdrop or its
  // own padding) rather than on any of its content — the standard way to
  // detect "clicked outside" for a native <dialog>.
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      dialogRef.current?.close();
    }
  }

  // Native <dialog> already confines Tab to its contents, but at the
  // boundary (tabbing forward past the last element, or backward past the
  // first) some browsers briefly move focus to <body> for one keypress
  // before wrapping back in, rather than cycling directly. This closes that
  // gap explicitly so focus never has an instant with no visible indicator.
  function handleTabWrap(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-tag-title"
      onClick={handleBackdropClick}
      onKeyDown={handleTabWrap}
      className="m-auto w-full max-w-sm rounded-xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/30"
    >
      <div className="flex items-center justify-between">
        <h2 id="create-tag-title" className="text-lg font-semibold text-stone-900">
          Create New Tag
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close dialog"
          className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-600"
        >
          <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
            ref={nameInputRef}
            type="text"
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
            onClick={() => dialogRef.current?.close()}
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
    </dialog>
  );
}
