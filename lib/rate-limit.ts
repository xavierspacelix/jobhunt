type Bucket = { count: number; resetAt: number };

export type FixedWindowOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export function createFixedWindowRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: FixedWindowOptions): (key: string) => boolean {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Rate-limit maximum must be a positive integer");
  }
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error("Rate-limit window must be a positive integer");
  }

  const buckets = new Map<string, Bucket>();
  return (key: string) => {
    const currentTime = now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= currentTime) {
      buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const windowMs = positiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);

export const matchRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_MATCH_MAX, 10),
  windowMs,
});
export const coverLetterRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_COVER_LETTER_MAX, 10),
  windowMs,
});
export const cvUploadRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_CV_UPLOAD_MAX, 10),
  windowMs,
});
export const jobSearchRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_JOB_SEARCH_MAX, 10),
  windowMs,
});
export const jobFetchRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_JOB_FETCH_MAX, 10),
  windowMs,
});
export const recommendKeywordsRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_RECOMMEND_KEYWORDS_MAX, 10),
  windowMs,
});
export const recommendationSaveRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_RECOMMENDATION_SAVE_MAX, 10),
  windowMs,
});
export const registerRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_REGISTER_MAX, 5),
  windowMs,
});
export const loginRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_LOGIN_MAX, 10),
  windowMs,
});
export const extensionTokenRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_EXTENSION_TOKEN_MAX, 20),
  windowMs,
});
export const extensionAuthorizeRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_EXTENSION_AUTHORIZE_MAX, 10),
  windowMs,
});
export const extensionJobRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_EXTENSION_JOB_MAX, 60),
  windowMs,
});
export const extensionApiRateLimit = createFixedWindowRateLimiter({
  limit: positiveInt(process.env.RATE_LIMIT_EXTENSION_API_MAX, 120),
  windowMs,
});
