"use client";

import * as React from "react";
import { CheckIcon, DownloadIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

const EXTENSION_FILENAME = "jobhunter-chrome-extension.zip";

export function ExtensionDownloadButton({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const [loading, setLoading] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/extension/download");
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Masuk kembali untuk mengunduh ekstensi."
            : "Ekstensi gagal diunduh. Coba lagi.",
        );
        return;
      }

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = EXTENSION_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      setDownloaded(true);
    } catch {
      setError("Ekstensi gagal diunduh. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        aria-label={
          loading
            ? "Sedang mengunduh ekstensi Chrome JobHunter"
            : downloaded
              ? "Ekstensi Chrome JobHunter sudah diunduh"
              : "Unduh ekstensi Chrome JobHunter"
        }
        aria-busy={loading}
        aria-describedby={error ? "extension-download-error" : undefined}
        disabled={loading || downloaded}
        onClick={handleDownload}
      >
        {loading ? (
          <Loader2Icon
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : downloaded ? (
          <CheckIcon className="size-4" aria-hidden="true" />
        ) : (
          <DownloadIcon className="size-4" aria-hidden="true" />
        )}
        <span className={showLabel ? "inline" : "hidden lg:inline"}>
          {loading
            ? "Mengunduh..."
            : downloaded
              ? "Ekstensi diunduh"
              : "Unduh ekstensi"}
        </span>
      </Button>
      {error ? (
        <p
          id="extension-download-error"
          className="border-border bg-card text-destructive absolute top-full right-0 z-50 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-lg border px-3 py-2 text-xs shadow-md"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {downloaded ? "Ekstensi Chrome JobHunter berhasil diunduh." : ""}
      </span>
    </div>
  );
}
