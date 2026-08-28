"use client";

import { useState } from "react";
import type { TagDTO } from "@/types/note";
import { colorForTag, type TagColorKey } from "@/lib/notes/tag-colors";
import { SignOutButton } from "@/components/notes/sign-out-button";
import { CreateTagModal } from "@/components/notes/create-tag-modal";
import { AiChatPanel } from "@/components/notes/ai-chat-panel";

export type ViewFilter = "all" | "favorites";

export function Sidebar({
  userEmail,
  tags,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
  view,
  onChangeView,
  totalCount,
  favoriteCount,
  aiChatEnabled,
}: {
  userEmail: string;
  tags: TagDTO[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onCreateTag: (name: string, color: TagColorKey) => Promise<void>;
  view: ViewFilter;
  onChangeView: (view: ViewFilter) => void;
  totalCount: number;
  favoriteCount: number;
  aiChatEnabled: boolean;
}) {
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-stone-200 bg-stone-100/60 p-4">
      <header className="flex items-center gap-2 px-2 pb-4">
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-base font-bold text-white"
        >
          P
        </span>
        <span className="text-lg font-bold tracking-tight text-stone-900">Paged</span>
      </header>

      <nav aria-label="Note views" className="space-y-1">
        <SidebarButton active={view === "all"} onClick={() => onChangeView("all")} count={totalCount}>
          <BookIcon /> All Notes
        </SidebarButton>
        <SidebarButton active={view === "favorites"} onClick={() => onChangeView("favorites")} count={favoriteCount}>
          <HeartIcon /> Favorites
        </SidebarButton>
      </nav>

      <section aria-labelledby="sidebar-tags-heading" className="mt-6 flex-1 overflow-y-auto">
        <h2 id="sidebar-tags-heading" className="px-3 text-xs font-semibold uppercase tracking-wide text-stone-600">
          Tags
        </h2>
        {tags.length === 0 ? (
          <p className="px-3 py-2 text-sm text-stone-600">No tags yet</p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              const color = colorForTag(tag.name, tag.color);
              return (
                <li key={tag.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggleTag(tag.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      isSelected ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    <span aria-hidden className={`h-2 w-2 rounded-full ${isSelected ? "bg-white" : color.dot}`} />
                    {tag.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setIsCreateTagOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-sm text-stone-500 hover:border-teal-400 hover:text-teal-700"
        >
          <PlusIcon /> New Tag
        </button>
      </section>

      <footer className="mt-4 space-y-1 border-t border-stone-200 pt-3">
        {aiChatEnabled && <AiChatPanel />}
        <p className="truncate px-3 pb-1 text-xs text-stone-600">{userEmail}</p>
        <SignOutButton />
      </footer>

      {isCreateTagOpen && <CreateTagModal onClose={() => setIsCreateTagOpen(false)} onCreate={onCreateTag} />}
    </aside>
  );
}

function SidebarButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        active ? "bg-teal-700 text-white" : "text-stone-700 hover:bg-stone-200"
      }`}
    >
      {children}
      <span className={`ml-auto rounded-full px-2 text-xs ${active ? "bg-white/20" : "bg-stone-200 text-stone-500"}`}>
        {count}
      </span>
    </button>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        d="M4 4.5A1.5 1.5 0 0 1 5.5 3H10v14H5.5A1.5 1.5 0 0 1 4 15.5v-11ZM16 4.5A1.5 1.5 0 0 0 14.5 3H10v14h4.5a1.5 1.5 0 0 0 1.5-1.5v-11Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        d="M10 17.25s-6.5-4.06-8.5-8.06C.36 6.66 2 3.75 5 3.75c1.7 0 3.15 1 4 2.25.85-1.25 2.3-2.25 4-2.25 3 0 4.64 2.91 3.5 5.44-2 4-8.5 8.06-8.5 8.06Z"
        strokeLinejoin="round"
      />
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
