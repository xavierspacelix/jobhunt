import { cn } from "@/lib/utils"
import { STATUS_LABELS, STATUS_VAR, type AppStatus } from "@/lib/kanban"

export function StatusBadge({
  status,
  className,
}: {
  status: AppStatus
  className?: string
}) {
  const color = STATUS_VAR[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {STATUS_LABELS[status]}
    </span>
  )
}
