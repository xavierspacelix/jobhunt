import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function StatCard({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="flex size-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
