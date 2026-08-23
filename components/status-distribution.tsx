import {
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_VAR,
  type AppStatus,
} from "@/lib/kanban";

export function StatusDistribution({
  applications,
}: {
  applications: { status: AppStatus }[];
}) {
  const total = applications.length;
  const counts = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: STATUS_VAR[status],
    count: applications.filter((a) => a.status === status).length,
  }));
  const segments = counts.filter((c) => c.count > 0);
  const summary = segments
    .map((segment) => {
      const percentage = Math.round((segment.count / total) * 100);
      return `${segment.label}: ${segment.count} (${percentage}%)`;
    })
    .join(", ");

  return (
    <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-medium">
          Distribusi Status
        </h2>
        <span className="text-muted-foreground text-xs">{total} lamaran</span>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">Belum ada lamaran.</p>
      ) : (
        <>
          <div
            className="bg-muted mt-4 flex h-2.5 w-full overflow-hidden rounded-full"
            role="img"
            aria-label={`Distribusi status lamaran. ${summary}.`}
          >
            {segments.map((s) => (
              <div
                key={s.status}
                aria-hidden="true"
                style={{
                  width: `${(s.count / total) * 100}%`,
                  backgroundColor: s.color,
                }}
              />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {counts.map((c) => (
              <li key={c.status} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {c.label}
                </span>
                <span className="text-foreground ml-auto font-medium">
                  {c.count}
                  <span className="sr-only">
                    {`, ${Math.round((c.count / total) * 100)} persen`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
