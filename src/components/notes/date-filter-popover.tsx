"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  DATE_FILTER_PRESETS,
  resolveDateRange,
  validateCustomRange,
  type AppliedDateFilter,
  type DateFilterPreset,
} from "@/lib/notes/date-ranges";

/**
 * The "Filter" button next to the search box and the popover it opens. Not a
 * modal — same pattern as `AiChatPanel` — since the rest of the app stays
 * usable while it's open: focus moves in on open and Escape closes it and
 * returns focus to the toggle button, but nothing traps Tab inside it.
 * Selecting a preset doesn't filter anything by itself; "Apply" is what
 * resolves it into an actual date range and hands it to the parent, so
 * changing your mind while browsing the radio options never fires a request.
 */
export function DateFilterPopover({
  value,
  onApply,
  onClear,
}: {
  value: AppliedDateFilter | null;
  onApply: (filter: AppliedDateFilter) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<DateFilterPreset>(value?.preset ?? "today");
  const [customFrom, setCustomFrom] = useState(value?.custom?.from ?? "");
  const [customTo, setCustomTo] = useState(value?.custom?.to ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const firstRadioRef = useRef<HTMLInputElement>(null);

  // Re-sync the form to whatever's currently applied each time the popover
  // (re)opens, rather than remembering an abandoned edit from last time.
  // Adjusting state during render — React's recommended alternative to a
  // setState-in-effect — instead of a useEffect keyed on `isOpen`.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setPreset(value?.preset ?? "today");
      setCustomFrom(value?.custom?.from ?? "");
      setCustomTo(value?.custom?.to ?? "");
      setValidationError(null);
    }
  }

  // Moving focus into the popover is a real DOM side effect (unlike the
  // state resets above), so it stays in an effect.
  useEffect(() => {
    if (isOpen) firstRadioRef.current?.focus();
  }, [isOpen]);

  // Non-modal popovers don't get automatic "click outside to dismiss"
  // behavior the way a native <dialog>'s backdrop does, so it's added here
  // explicitly — standard expectation for a filter menu like this one.
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || toggleButtonRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function closePopover() {
    setIsOpen(false);
    toggleButtonRef.current?.focus();
  }

  function handlePopoverKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closePopover();
    }
  }

  function handleApply() {
    if (preset === "custom") {
      const error = validateCustomRange({ from: customFrom, to: customTo });
      if (error) {
        setValidationError(error);
        return;
      }
    }

    const range = resolveDateRange(preset, new Date(), { from: customFrom, to: customTo });
    if (!range) return; // Only reachable for "custom" with no dates, already caught above.

    onApply({ preset, range, custom: preset === "custom" ? { from: customFrom, to: customTo } : undefined });
    closePopover();
  }

  function handleClear() {
    onClear();
    closePopover();
  }

  return (
    <div className="relative">
      <button
        ref={toggleButtonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-pressed={isOpen}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          value
            ? "border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100"
            : "border-stone-300 text-stone-600 hover:bg-stone-100"
        }`}
      >
        <FilterIcon />
        Filter
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Search filters"
          onKeyDown={handlePopoverKeyDown}
          className="absolute right-0 top-full z-10 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">Search Filters</h2>
            <button
              type="button"
              onClick={closePopover}
              aria-label="Close filters"
              className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-600"
            >
              <CloseIcon />
            </button>
          </div>

          <fieldset className="mt-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-stone-500">Date</legend>
            <div role="radiogroup" className="mt-2 space-y-1.5">
              {DATE_FILTER_PRESETS.map((option, index) => (
                <label
                  key={option.key}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-stone-700 hover:bg-stone-50"
                >
                  <input
                    ref={index === 0 ? firstRadioRef : undefined}
                    type="radio"
                    name="date-filter-preset"
                    value={option.key}
                    checked={preset === option.key}
                    onChange={() => {
                      setPreset(option.key);
                      setValidationError(null);
                    }}
                    className="h-4 w-4 border-stone-300 text-teal-700"
                  />
                  {option.label}
                </label>
              ))}
            </div>

            {preset === "custom" && (
              <div className="mt-2 space-y-2 rounded-lg bg-stone-50 p-3">
                <div>
                  <label htmlFor="date-filter-from" className="block text-xs font-medium text-stone-600">
                    From
                  </label>
                  <input
                    id="date-filter-from"
                    type="date"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(event) => {
                      setCustomFrom(event.target.value);
                      setValidationError(null);
                    }}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-2 py-1 text-sm focus-visible:border-teal-600"
                  />
                </div>
                <div>
                  <label htmlFor="date-filter-to" className="block text-xs font-medium text-stone-600">
                    To
                  </label>
                  <input
                    id="date-filter-to"
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(event) => {
                      setCustomTo(event.target.value);
                      setValidationError(null);
                    }}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-2 py-1 text-sm focus-visible:border-teal-600"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {validationError && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {validationError}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!value}
              className="text-sm font-medium text-stone-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 4h14M6 10h8M8.5 16h3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}
