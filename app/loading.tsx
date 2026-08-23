import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border h-16 border-b">
        <div className="mx-auto flex h-full w-full max-w-7xl min-w-0 items-center justify-between gap-4 px-4 md:px-6">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </header>
      <main
        className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 md:p-6"
        aria-busy="true"
      >
        <p className="sr-only" role="status" aria-live="polite">
          Memuat halaman...
        </p>
        <div className="space-y-3">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
