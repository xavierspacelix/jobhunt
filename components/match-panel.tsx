"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

type MatchResponse = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  source?: "ai" | "heuristic";
  cached?: boolean;
};

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-destructive)";
}

export function MatchPanel({
  jobId,
  autoRun = false,
}: {
  jobId: string;
  autoRun?: boolean;
}) {
  const [state, setState] = React.useState<
    "idle" | "loading" | "done" | "error"
  >(autoRun ? "loading" : "idle");
  const [result, setResult] = React.useState<MatchResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (autoRun) check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  async function check() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 400) {
        setError(data?.error ?? "Gagal mengecek kecocokan.");
        setState("error");
        return;
      }
      if (res.status === 429) {
        setError(data?.error ?? "Terlalu banyak permintaan.");
        setState("error");
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? "Gagal mengecek kecocokan.");
        setState("error");
        return;
      }
      setResult(data as MatchResponse);
      setState("done");
    } catch {
      setError("Terjadi kesalahan saat mengecek kecocokan.");
      setState("error");
    }
  }

  const color = result ? scoreColor(result.score) : "var(--color-muted-status)";

  return (
    <div>
      {state === "idle" && (
        <Button variant="outline" size="sm" onClick={check}>
          Cek Kecocokan
        </Button>
      )}

      {state === "loading" && (
        <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm" role="status" aria-live="polite">
          <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
          Memeriksa kecocokan…
        </div>
      )}

      {state === "error" && (
        <div className="space-y-2">
          <p className="text-destructive text-sm" role="alert">{error}</p>
          {error?.includes("CV") && (
            <Link
              href="/profile"
              className="text-accent inline-block text-sm font-medium hover:underline"
            >
              Ke halaman profil
            </Link>
          )}
          <div>
            <Button variant="outline" size="sm" onClick={check}>
              Coba lagi
            </Button>
          </div>
        </div>
      )}

      {state === "done" && result && (
        <div className="space-y-3" role="status" aria-live="polite" aria-atomic="true">
          <div className="flex items-center gap-3">
            <div
              className="flex size-14 flex-col items-center justify-center rounded-full border text-center"
              style={{
                color,
                borderColor: color,
                backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              }}
            >
              <span className="text-lg leading-none font-bold">
                {result.score}
              </span>
              <span className="text-[10px] opacity-70">/ 100</span>
            </div>
            <div className="text-muted-foreground text-xs">
              <p>
                {result.source === "ai"
                  ? "Skor dari AI"
                  : result.source === "heuristic"
                    ? "Skor heuristik"
                    : "Skor tersimpan"}
              </p>
              {result.cached && <p>Cache hit — tidak memanggil LLM.</p>}
            </div>
          </div>

          {result.matchedSkills.length > 0 && (
            <div>
              <p className="text-foreground mb-1 text-xs font-medium">Cocok</p>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border px-2 py-0.5 text-xs"
                    style={{
                      color: "var(--color-success)",
                      borderColor: "var(--color-success)",
                      backgroundColor:
                        "color-mix(in srgb, var(--color-success) 12%, transparent)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missingSkills.length > 0 && (
            <div>
              <p className="text-foreground mb-1 text-xs font-medium">
                Kurang / belum dimiliki
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.missingSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border px-2 py-0.5 text-xs"
                    style={{
                      color: "var(--color-destructive)",
                      borderColor: "var(--color-destructive)",
                      backgroundColor:
                        "color-mix(in srgb, var(--color-destructive) 12%, transparent)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={check}>
            Hitung ulang
          </Button>
        </div>
      )}
    </div>
  );
}
