"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { apiFetch, ApiClientError } from "@/lib/api-client";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

/**
 * A simple Notion-AI-style chat entry point pinned near the bottom of the
 * sidebar. Deliberately not persisted anywhere — it's an in-memory scratch
 * conversation for the current tab, reset by "New chat" or a page refresh.
 * The Gemini API key never reaches the browser: this only ever talks to our
 * own `/api/ai/chat` route, which holds the key server-side.
 */
export function AiChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isSending]);

  // Not a modal — the rest of the app stays interactive while this is open —
  // so focus moves into it on open but isn't trapped, matching the ARIA
  // authoring practice for a non-modal dialog. Escape still closes it and
  // returns focus to the toggle button, same as the (modal) tag dialog.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function closePanel() {
    setIsOpen(false);
    toggleButtonRef.current?.focus();
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closePanel();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const { reply } = await apiFetch<{ reply: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages }),
      });
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function startNewChat() {
    setMessages([]);
    setError(null);
    setDraft("");
  }

  return (
    <div className="relative">
      {isOpen && (
        <div
          role="dialog"
          aria-label="AI chat"
          onKeyDown={handlePanelKeyDown}
          className="absolute bottom-full left-0 mb-2 flex h-96 w-80 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
              <SparkleIcon /> AI Chat
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startNewChat}
                title="New chat"
                aria-label="Start a new chat"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-600"
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close chat"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-600"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-stone-500">Ask me anything — I&apos;m not connected to your notes yet.</p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user" ? "ml-auto bg-teal-700 text-white" : "bg-stone-100 text-stone-700"
                }`}
              >
                {message.text}
              </div>
            ))}
            {isSending && (
              <div className="max-w-[85%] rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600" aria-live="polite">
                Thinking…
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mx-3 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-stone-100 p-2">
            <label htmlFor="ai-chat-input" className="sr-only">
              Message
            </label>
            <input
              id="ai-chat-input"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask AI…"
              disabled={isSending}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus-visible:border-teal-600"
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              aria-label="Send message"
              className="rounded-lg bg-teal-700 p-2 text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}

      <button
        ref={toggleButtonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-pressed={isOpen}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-200"
      >
        <SparkleIcon /> Ask AI
      </button>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 text-teal-700" fill="currentColor">
      <path d="M10 2l1.6 4.9L16.5 8l-4.9 1.6L10 14.5l-1.6-4.9L3.5 8l4.9-1.1L10 2Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
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

function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M2.5 2.5l15 7.5-15 7.5L5 10 2.5 2.5Z" />
    </svg>
  );
}
