import { z } from "zod";
import { DEFAULT_TAG_COLOR_KEY, TAG_COLOR_PRESETS } from "@/lib/notes/tag-colors";

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Tag name is required")
  .max(40, "Tag name must be at most 40 characters");

const tagColorKeys = TAG_COLOR_PRESETS.map((preset) => preset.key) as [string, ...string[]];
export const tagColorSchema = z.enum(tagColorKeys).default(DEFAULT_TAG_COLOR_KEY);

export const createTagSchema = z.object({
  name: tagNameSchema,
  color: tagColorSchema,
});
export type CreateTagInput = z.infer<typeof createTagSchema>;
