"use client";

import * as React from "react";
import {
  CheckCircle2Icon,
  CircleOffIcon,
  Loader2Icon,
  PuzzleIcon,
  UnplugIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExtensionDownloadButton } from "@/components/extension-download-button";

type ConnectionStatus = {
  connected: boolean;
  activeInstallations?: number;
  currentBrowserConnected?: boolean;
  createdAt?: string;
  lastUsedAt?: string;
};

type ExtensionPing = {
  installed: true;
  installationId: string | null;
  version?: string;
};

const BUNDLED_EXTENSION_ID = "lokhjkfokakakehiojciicjhfokmkldg";

function pingBundledExtension(): Promise<ExtensionPing | null> {
  const chromeRuntime = (
    globalThis as typeof globalThis & {
      chrome?: {
        runtime?: {
          lastError?: { message?: string };
          sendMessage?: (
            extensionId: string,
            message: unknown,
            callback: (response?: ExtensionPing) => void,
          ) => void;
        };
      };
    }
  ).chrome?.runtime;
  if (!chromeRuntime?.sendMessage) return Promise.resolve(null);

  return new Promise((resolve) => {
    chromeRuntime.sendMessage?.(
      BUNDLED_EXTENSION_ID,
      { type: "JOBHUNTER_PING" },
      (response) => {
        if (chromeRuntime.lastError || !response?.installed) resolve(null);
        else resolve(response);
      },
    );
  });
}

function formatConnectionDate(value?: string): string {
  if (!value) return "Belum pernah digunakan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ExtensionConnectionCard() {
  const [status, setStatus] = React.useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [revoking, setRevoking] = React.useState(false);
  const [confirmRevoke, setConfirmRevoke] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [extensionPing, setExtensionPing] = React.useState<ExtensionPing | null>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const ping = await pingBundledExtension();
        const query = ping?.installationId
          ? `?installationId=${encodeURIComponent(ping.installationId)}`
          : "";
        const response = await fetch(`/api/extension/connection${query}`);
        const data = (await response.json().catch(() => null)) as
          ConnectionStatus | { error?: string } | null;
        if (!response.ok || !data || !("connected" in data)) {
          throw new Error("status failed");
        }
        if (!cancelled) {
          setExtensionPing(ping);
          setStatus(data);
        }
      } catch {
        if (!cancelled) {
          setError("Status extension gagal dimuat. Coba lagi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setError(null);
    setLoading(true);
    setReloadKey((value) => value + 1);
  }

  async function revokeConnection() {
    setRevoking(true);
    setError(null);
    setAnnouncement("");

    try {
      const response = await fetch("/api/extension/connection", {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Koneksi extension gagal dicabut. Coba lagi.");
        return;
      }
      setStatus({ connected: false });
      setConfirmRevoke(false);
      setAnnouncement("Koneksi extension berhasil dicabut.");
    } catch {
      setError("Koneksi extension gagal dicabut. Periksa koneksi Anda.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <section
      className="border-border bg-card rounded-2xl border p-5 shadow-sm md:p-6"
      aria-labelledby="extension-connection-title"
      aria-busy={loading || revoking}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-accent/10 text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
            <PuzzleIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="extension-connection-title"
              className="text-foreground text-sm font-semibold"
            >
              Koneksi Extension
            </h2>
            <p className="text-muted-foreground text-xs">Chrome dan Edge</p>
          </div>
        </div>

        {!loading && status ? (
          <span className="border-border bg-secondary text-secondary-foreground inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
            {status.connected ? (
              <CheckCircle2Icon
                className="text-accent size-3.5"
                aria-hidden="true"
              />
            ) : (
              <CircleOffIcon
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
            )}
            {status.connected ? "Terhubung" : "Belum terhubung"}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 space-y-2" role="status">
          <span className="sr-only">Memuat status koneksi extension.</span>
          <div className="bg-muted h-4 w-4/5 animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-muted h-4 w-3/5 animate-pulse rounded motion-reduce:animate-none" />
        </div>
      ) : error && !status ? (
        <div className="mt-5" role="alert">
          <p className="text-destructive text-sm">{error}</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={retry}>
            Coba lagi
          </Button>
        </div>
      ) : status ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <ExtensionDownloadButton showLabel />
            <span className="border-border bg-secondary text-secondary-foreground inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-medium">
              {extensionPing
                ? `Terpasang di browser ini${extensionPing.version ? ` · v${extensionPing.version}` : ""}`
                : "Belum terdeteksi di browser ini"}
            </span>
          </div>
          {status.connected ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">
                  Terhubung sejak
                </dt>
                <dd className="text-foreground mt-0.5">
                  {formatConnectionDate(status.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">
                  Terakhir digunakan
                </dt>
                <dd className="text-foreground mt-0.5">
                  {formatConnectionDate(status.lastUsedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Instalasi aktif</dt>
                <dd className="text-foreground mt-0.5">
                  {status.activeInstallations ?? 0} browser
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Browser ini</dt>
                <dd className="text-foreground mt-0.5">
                  {!extensionPing
                    ? "Extension belum terdeteksi"
                    : status.currentBrowserConnected
                      ? "Terhubung ke akun ini"
                      : "Belum terhubung ke akun ini"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm leading-6">
              Buka extension JobHunter, lalu klik{" "}
              <strong>Hubungkan akun</strong> untuk menyimpan lowongan ke akun
              ini.
            </p>
          )}

          {error ? (
            <p
              className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {status.connected ? (
            confirmRevoke ? (
              <div className="border-border bg-secondary rounded-xl border p-3">
                <p className="text-foreground text-sm">
                  Cabut akses extension dari semua browser?
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Lowongan yang sudah tersimpan tidak akan dihapus.
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revoking}
                    onClick={() => setConfirmRevoke(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revoking}
                    onClick={revokeConnection}
                  >
                    {revoking ? (
                      <Loader2Icon
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <UnplugIcon aria-hidden="true" />
                    )}
                    {revoking ? "Mencabut..." : "Ya, cabut akses"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmRevoke(true)}
              >
                <UnplugIcon aria-hidden="true" />
                Cabut koneksi
              </Button>
            )
          ) : null}
        </div>
      ) : null}

      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </section>
  );
}
