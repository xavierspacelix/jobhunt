import { z } from "zod";

export const jobSearchInputSchema = z
  .object({
    keywords: z
      .union([z.string().max(1000), z.array(z.string().max(200)).max(50)])
      .optional(),
    query: z.string().max(1000).optional(),
    location: z.string().max(200).optional(),
  })
  .strict();

export function parseJobSearchInput(value: unknown) {
  return jobSearchInputSchema.safeParse(value);
}
