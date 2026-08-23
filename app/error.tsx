"use client";

import { CircleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="bg-background min-h-dvh">
      <header className="border-border h-16 border-b">
        <div className="mx-auto flex h-full w-full max-w-7xl min-w-0 items-center px-4 md:px-6">
          <span className="text-foreground text-sm font-semibold">
            JobHunter
          </span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl min-w-0 justify-center p-4 pt-12 md:p-6 md:pt-16">
        <section
          className="border-border bg-card w-full max-w-md rounded-2xl border p-6 text-center shadow-sm"
          role="alert"
          aria-labelledby="page-error-title"
        >
          <span className="bg-destructive/10 text-destructive mx-auto flex size-11 items-center justify-center rounded-xl">
            <CircleAlertIcon className="size-5" aria-hidden="true" />
          </span>
          <h1
            id="page-error-title"
            className="text-foreground mt-4 text-xl font-semibold"
          >
            Halaman gagal dimuat
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Terjadi kendala sementara. Coba muat halaman ini kembali.
          </p>
          <Button type="button" className="mt-5" onClick={reset}>
            Coba lagi
          </Button>
        </section>
      </main>
    </div>
  );
}
