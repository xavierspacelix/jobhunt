import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  markOnly?: boolean;
};

export function BrandLogo({ className, markOnly = false }: BrandLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={markOnly ? "JobHunter" : undefined}
      role={markOnly ? "img" : undefined}
    >
      <svg
        viewBox="0 0 44 44"
        className="size-9 shrink-0"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="40" height="40" rx="12" className="fill-accent" />
        <path
          d="m11.5 29 7.25-7.25 5.5 5.5L33 16"
          fill="none"
          className="stroke-accent-foreground"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 16h6v6"
          fill="none"
          className="stroke-accent-foreground"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {markOnly ? null : (
        <span className="text-lg font-medium tracking-[-0.035em] text-foreground">
          <strong className="font-semibold">Job</strong>Hunter
        </span>
      )}
    </span>
  );
}
