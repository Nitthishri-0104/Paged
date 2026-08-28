import { z } from "zod";

export const noteTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be at most 200 characters");

// Stored as sanitized HTML (headings/bold/italic/lists/links), which takes
// more bytes than the same text would as plain text — the cap is raised
// accordingly from the plain-text-era limit.
export const noteBodySchema = z.string().max(50_000, "Note is too long");

const tagIdsSchema = z.array(z.string().cuid()).max(20, "A note can have at most 20 tags");

export const createNoteSchema = z.object({
  title: noteTitleSchema,
  body: noteBodySchema.optional().default(""),
  tagIds: tagIdsSchema.optional().default([]),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z
  .object({
    title: noteTitleSchema.optional(),
    body: noteBodySchema.optional(),
    tagIds: tagIdsSchema.optional(),
    favorite: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const SORT_OPTIONS = ["newest", "oldest"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const notesQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value ? value : undefined)),
    tagIds: z.array(z.string().cuid()).optional(),
    sort: z.enum(SORT_OPTIONS).default("newest"),
    favoritesOnly: z.boolean().optional().default(false),
    // Absolute instants (not bare dates) — the client resolves "Today" /
    // "This week" / a custom range into concrete UTC timestamps using the
    // user's own local timezone *before* sending the request, so the
    // server only ever compares real instants and never has to guess which
    // timezone a bare "2026-08-28" was meant in.
    createdFrom: z.string().datetime().optional(),
    createdTo: z.string().datetime().optional(),
  })
  .refine((data) => !data.createdFrom || !data.createdTo || data.createdFrom <= data.createdTo, {
    message: "Start date must be on or before the end date",
    path: ["createdFrom"],
  });
export type NotesQuery = z.infer<typeof notesQuerySchema>;

/**
 * Parses a notes-list `URLSearchParams` into a validated query object.
 * Pulled out of the route handler so the same parsing logic can be unit
 * tested without spinning up a server.
 */
export function parseNotesQuery(searchParams: URLSearchParams): NotesQuery {
  const tagIds = searchParams.getAll("tagId");
  return notesQuerySchema.parse({
    q: searchParams.get("q") ?? undefined,
    tagIds: tagIds.length > 0 ? tagIds : undefined,
    sort: searchParams.get("sort") ?? undefined,
    favoritesOnly: searchParams.get("favoritesOnly") === "true",
    createdFrom: searchParams.get("createdFrom") ?? undefined,
    createdTo: searchParams.get("createdTo") ?? undefined,
  });
}
