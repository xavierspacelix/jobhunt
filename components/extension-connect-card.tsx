"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PuzzleIcon,
  ShieldCheckIcon,
} from "lucide-react";

import type { ExtensionConnectRequest } from "@/components/extension-connect-query";
import { Button } from "@/components/ui/button";

export function ExtensionConnectCard({
  request,
  validationError,
}: {
  request: ExtensionConnectRequest | null;
  validationError?: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAuthorize() {
    if (!request) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/extension/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        redirectUrl?: string;
      } | null;

      if (!response.ok || !data?.redirectUrl) {
        setError(
          data?.error ??
            "Extension gagal dihubungkan. Coba mulai ulang dari extension.",
        );
        return;
      }

      const destination = new URL(data.redirectUrl, window.location.origin);
      const localHttp =
        destination.protocol === "http:" &&
        (destination.hostname === "localhost" ||
          destination.hostname === "127.0.0.1");
      if (destination.protocol !== "https:" && !localHttp) {
        setError("Tujuan pengembalian extension tidak aman.");
        return;
      }

      window.location.assign(data.redirectUrl);
    } catch {
      setError("Extension gagal dihubungkan. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (window.opener) {
      window.close();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.replace("/dashboard");
  }

  return (
    <section
      className="border-border bg-card mx-auto w-full max-w-xl rounded-2xl border p-5 shadow-sm md:p-7"
      aria-labelledby="extension-connect-title"
      aria-busy={loading}
    >
      <div className="flex items-start gap-4">
        <span className="bg-accent/10 text-accent flex size-11 shrink-0 items-center justify-center rounded-xl">
          <PuzzleIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            JobHunter Extension
          </p>
          <h1
            id="extension-connect-title"
            className="text-foreground text-xl font-semibold tracking-tight"
          >
            Hubungkan extension ke akun ini
          </h1>
        </div>
      </div>

      {request ? (
        <>
          <div className="bg-secondary text-secondary-foreground mt-6 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon
                className="text-accent mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-2">
                <h2 className="text-foreground text-sm font-semibold">
                  Izin yang diminta
                </h2>
                <p className="text-sm leading-6">
                  Extension hanya meminta izin untuk menyimpan lowongan yang
                  kamu ambil dari halaman detail Glints atau Jobstreet ke akun
                  JobHunter.
                </p>
                <p className="text-muted-foreground text-xs">
                  Extension tidak menerima password akun dan tidak dapat
                  mengirim lamaran atas namamu. Extension membaca nama dan email
                  akun agar kamu dapat memastikan tujuan penyimpanan.
                </p>
                <p className="text-muted-foreground font-mono text-[11px] break-all">
                  ID resmi: {new URL(request.redirectUri).hostname.split(".")[0]}
                </p>
              </div>
            </div>
          </div>

          {error ? (
            <p
              className="border-destructive/40 bg-destructive/10 text-destructive mt-4 rounded-lg border px-4 py-3 text-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              <ArrowLeftIcon aria-hidden="true" />
              Batal
            </Button>
            <Button
              type="button"
              variant="cta"
              onClick={handleAuthorize}
              disabled={loading}
            >
              {loading ? (
                <Loader2Icon
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2Icon aria-hidden="true" />
              )}
              {loading ? "Menghubungkan..." : "Hubungkan extension"}
            </Button>
          </div>
          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {loading ? "Sedang menghubungkan extension ke akun JobHunter." : ""}
          </p>
        </>
      ) : (
        <div className="mt-6">
          <p
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
            role="alert"
          >
            {validationError ?? "Permintaan koneksi extension tidak valid."}
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            Tutup halaman ini, lalu pilih Hubungkan akun kembali dari extension.
          </p>
          <Button
            className="mt-5"
            variant="outline"
            render={<Link href="/dashboard" />}
          >
            <ArrowLeftIcon aria-hidden="true" />
            Kembali ke dashboard
          </Button>
        </div>
      )}
    </section>
  );
}
