import {
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_VAR,
  type AppStatus,
} from "@/lib/kanban"

export function StatusDistribution({
  applications,
}: {
  applications: { status: AppStatus }[]
}) {
  const total = applications.length
  const counts = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_VAR[status],
    count: applications.filter((a) => a.status === status).length,
  }))
  const segments = counts.filter((c) => c.count > 0)

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">
          Distribusi Status
        </h2>
        <span className="text-xs text-muted-foreground">{total} lamaran</span>
      </div>

      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Belum ada lamaran.
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {segments.map((s) => (
              <div
                key={s.status}
                style={{
                  width: `${(s.count / total) * 100}%`,
                  backgroundColor: s.color,
                }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {counts.map((c) => (
              <li key={c.status} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate text-muted-foreground">
                  {c.label}
                </span>
                <span className="ml-auto font-medium text-foreground">
                  {c.count}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
