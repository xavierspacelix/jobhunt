import { z } from "zod";

const recommendationLlmSchema = z
  .object({
    keywords: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
    summary: z.string().trim().min(1).max(2000),
  })
  .strict();

export type KeywordRecommendation = z.infer<typeof recommendationLlmSchema>;

export function parseKeywordRecommendation(
  value: unknown,
): KeywordRecommendation {
  return recommendationLlmSchema.parse(value);
}
