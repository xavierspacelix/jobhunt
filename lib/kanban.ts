export const STATUS_ORDER = [
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const

export type AppStatus = (typeof STATUS_ORDER)[number]

export const STATUS_LABELS: Record<AppStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Melamar",
  SCREENING: "Seleksi",
  INTERVIEW: "Wawancara",
  OFFER: "Penawaran",
  REJECTED: "Ditolak",
}

export const STATUS_VAR: Record<AppStatus, string> = {
  WISHLIST: "var(--color-info)",
  APPLIED: "var(--color-success)",
  SCREENING: "var(--color-warning)",
  INTERVIEW: "var(--color-success)",
  OFFER: "var(--color-muted-status)",
  REJECTED: "var(--destructive)",
}

export function isAppStatus(value: unknown): value is AppStatus {
  return (
    typeof value === "string" &&
    (STATUS_ORDER as readonly string[]).includes(value)
  )
}
