import { z } from "zod";

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Tag name is required")
  .max(40, "Tag name must be at most 40 characters");

export const createTagSchema = z.object({
  name: tagNameSchema,
});
export type CreateTagInput = z.infer<typeof createTagSchema>;
