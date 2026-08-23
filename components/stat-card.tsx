import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card rounded-2xl border p-5 shadow-sm transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
        <span className="bg-accent/10 text-accent flex size-8 items-center justify-center rounded-xl">
          {icon}
        </span>
      </div>
      <p className="text-foreground mt-3 text-3xl font-bold tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
