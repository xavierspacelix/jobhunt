import { z } from "zod";

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().optional(),
);

const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(1),
    AUTH_URL: optionalUrl,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    MINIO_ENDPOINT: optionalString,
    MINIO_PORT: optionalPositiveInt,
    MINIO_ACCESS_KEY: optionalString,
    MINIO_SECRET_KEY: optionalString,
    MINIO_BUCKET: optionalString,
    MINIO_USE_SSL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(["true", "false"]).optional(),
    ),
    LLM_BASE_URL: optionalUrl,
    LLM_API_KEY: optionalString,
    LLM_MODEL: optionalString,
    LLM_TIMEOUT_MS: optionalPositiveInt,
    APP_ENCRYPTION_KEY: optionalString,
    RATE_LIMIT_WINDOW_MS: optionalPositiveInt,
    RATE_LIMIT_MATCH_MAX: optionalPositiveInt,
    RATE_LIMIT_COVER_LETTER_MAX: optionalPositiveInt,
    RATE_LIMIT_CV_UPLOAD_MAX: optionalPositiveInt,
    RATE_LIMIT_JOB_SEARCH_MAX: optionalPositiveInt,
    RATE_LIMIT_JOB_FETCH_MAX: optionalPositiveInt,
    RATE_LIMIT_RECOMMEND_KEYWORDS_MAX: optionalPositiveInt,
    RATE_LIMIT_RECOMMENDATION_SAVE_MAX: optionalPositiveInt,
    RATE_LIMIT_REGISTER_MAX: optionalPositiveInt,
    RATE_LIMIT_LOGIN_MAX: optionalPositiveInt,
    RATE_LIMIT_EXTENSION_AUTHORIZE_MAX: optionalPositiveInt,
    RATE_LIMIT_EXTENSION_TOKEN_MAX: optionalPositiveInt,
    RATE_LIMIT_EXTENSION_JOB_MAX: optionalPositiveInt,
    RATE_LIMIT_EXTENSION_API_MAX: optionalPositiveInt,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.AUTH_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_URL"],
        message: "AUTH_URL is required in production",
      });
    }
    if (env.NODE_ENV === "production" && env.AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET must be at least 32 characters in production",
      });
    }

    if (
      env.LLM_TIMEOUT_MS !== undefined &&
      (env.LLM_TIMEOUT_MS < 5_000 || env.LLM_TIMEOUT_MS > 300_000)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["LLM_TIMEOUT_MS"],
        message: "LLM_TIMEOUT_MS must be between 5000 and 300000",
      });
    }

    if (env.MINIO_ENDPOINT && (!env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MINIO_ENDPOINT"],
        message:
          "MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY must be configured together",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(
  environment: Record<string, string | undefined> = process.env,
): Env {
  return envSchema.parse(environment);
}
