export function safeCallbackUrl(value: string | null, origin: string): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}
