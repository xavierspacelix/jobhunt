import Link from "next/link"
import {
  CalendarClockIcon,
  ListChecksIcon,
} from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import type { AppStatus } from "@/lib/kanban"

export type AnalyticsApplication = {
  id: string
  status: AppStatus
  nextFollowUpAt: string | null
  job: {
    title: string
    company: string | null
    sourceUrl: string
  }
}

const ACTIVE_STATUSES: AppStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
]

const FOLLOWUP_WINDOW_DAYS = 7

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function relativeFollowUpLabel(iso: string, now: Date): string {
  const due = startOfDay(new Date(iso))
  const today = startOfDay(now)
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return "Lewat jadwal"
  if (diff === 0) return "Hari ini"
  if (diff === 1) return "Besok"
  return `${diff} hari lagi`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

export function ReminderList({
  applications,
}: {
  applications: AnalyticsApplication[]
}) {
  const now = new Date()

  const windowEnd = new Date(now)
  windowEnd.setDate(windowEnd.getDate() + FOLLOWUP_WINDOW_DAYS)

  const reminders = applications
    .filter(
      (a) =>
        a.nextFollowUpAt &&
        ACTIVE_STATUSES.includes(a.status) &&
        new Date(a.nextFollowUpAt) <= windowEnd,
    )
    .sort(
      (a, b) =>
        new Date(a.nextFollowUpAt!).getTime() -
        new Date(b.nextFollowUpAt!).getTime(),
    )

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CalendarClockIcon className="size-4" />
          </span>
          <h2 className="text-sm font-medium text-foreground">
            Tindak Lanjut ({FOLLOWUP_WINDOW_DAYS} hari ke depan)
          </h2>
        </div>
        <Link
          href="/tracker"
          className="text-sm text-accent hover:underline"
        >
          Buka Pelacak
        </Link>
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <ListChecksIcon className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Tidak ada tindak lanjut dalam {FOLLOWUP_WINDOW_DAYS} hari ke depan.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {reminders.map((app) => {
            const isInterview = app.status === "INTERVIEW"
            const iso = app.nextFollowUpAt!
            return (
              <li key={app.id}>
                <Link
                  href="/tracker"
                  className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {app.job.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[app.job.company, formatDate(iso)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={app.status} />
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: isInterview
                          ? "var(--color-success)"
                          : "var(--color-warning)",
                      }}
                    >
                      {relativeFollowUpLabel(iso, now)}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
