-- Semantic search has been removed; the note-level embedding vector it used is no longer read anywhere.
ALTER TABLE "notes" DROP COLUMN "embedding";
