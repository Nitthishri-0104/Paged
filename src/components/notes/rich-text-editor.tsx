"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";

/**
 * The note body editor. Content is stored and round-tripped as sanitized
 * HTML (see `src/lib/notes/sanitize-html.ts` on the server) rather than
 * plain text, so headings/bold/italic/lists/links survive a save and
 * reload. Pasting from another app goes through ProseMirror's own
 * schema-constrained HTML parsing, which is what actually strips foreign
 * formatting (inline styles, fonts, spans, tracking markup) — there's no
 * custom paste handler here beyond that default behavior. Undo/redo and
 * native Ctrl+C/Ctrl+V both keep working as ordinary browser/editor
 * behavior; nothing here intercepts them.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        id: "note-body",
        class:
          "prose prose-sm max-w-none min-h-[200px] text-base leading-relaxed text-stone-700 focus:outline-none " +
          "prose-headings:text-stone-900 prose-a:text-teal-700",
      },
    },
  });

  // Re-sync content only when it changed for a reason *other* than this
  // editor's own `onUpdate` (i.e. switching to a different note) — compare
  // against the editor's current HTML first so normal typing never
  // triggers a content reset that would jump the cursor.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="mb-3 flex flex-wrap items-center gap-1 border-b border-stone-100 pb-3"
    >
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <OrderedListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <QuoteIcon />
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <RedoIcon />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-teal-100 text-teal-800" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-stone-200" />;
}

function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M7 5h9M7 10h9M7 15h9" strokeLinecap="round" />
      <circle cx="3.5" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M7 5h9M7 10h9M7 15h9" strokeLinecap="round" />
      <text x="1" y="6.5" fontSize="5" fill="currentColor" stroke="none">
        1
      </text>
      <text x="1" y="11.5" fontSize="5" fill="currentColor" stroke="none">
        2
      </text>
      <text x="1" y="16.5" fontSize="5" fill="currentColor" stroke="none">
        3
      </text>
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        d="M6 8H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v1a2 2 0 0 1-2 2M15 8h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v1a2 2 0 0 1-2 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        d="M8 12a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1M12 8a3 3 0 0 0-4 0l-2 2a3 3 0 0 0 4 4l1-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5 8H12a4 4 0 0 1 0 8H8M5 8l3-3M5 8l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M15 8H8a4 4 0 0 0 0 8h4M15 8l-3-3M15 8l-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
