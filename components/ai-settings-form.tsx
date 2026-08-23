"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-1 h-11 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none md:h-9 md:text-sm";

export type AiSettingsInitial = {
  hasLlmApiKey: boolean;
  llmBaseUrl: string;
  llmModel: string;
};

export function AiSettingsForm({
  initial,
  onSaved,
}: {
  initial: AiSettingsInitial;
  onSaved?: () => void;
}) {
  const [llmBaseUrl, setLlmBaseUrl] = useState(initial.llmBaseUrl);
  const [llmModel, setLlmModel] = useState(initial.llmModel);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [clearLlmApiKey, setClearLlmApiKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload: Record<string, string | undefined> = {
        llmBaseUrl: llmBaseUrl.trim() || undefined,
        llmModel: llmModel.trim() || undefined,
      };
      if (clearLlmApiKey) payload.llmApiKey = "";
      else if (llmApiKey.trim()) payload.llmApiKey = llmApiKey.trim();
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan pengaturan AI.");
        return;
      }
      setSuccess(true);
      onSaved?.();
    } catch {
      setError("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseUrl: llmBaseUrl.trim() || undefined,
          apiKey: llmApiKey.trim() || undefined,
          model: llmModel.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        model?: string;
        error?: string;
        warning?: string;
      };
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          message: `Berhasil terhubung (${data.model ?? "model"}).${
            data.warning ? " " + data.warning : ""
          }`,
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error ?? "Gagal menghubungi LLM.",
        });
      }
    } catch {
      setTestResult({ ok: false, message: "Terjadi kesalahan saat menguji." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground mb-1 text-xs">
        Masukkan kunci API LLM Anda sendiri (endpoint OpenAI-compatible, mis.
        OpenAI, DeepSeek, Groq, OpenRouter, Ollama). Setiap akun menanggung
        biaya API-nya masing-masing.
      </p>
      <label className="block">
        <span className="text-muted-foreground text-xs">Base URL</span>
        <input
          value={llmBaseUrl}
          onChange={(e) => setLlmBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-muted-foreground text-xs">API Key</span>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={llmApiKey}
            onChange={(e) => {
              setLlmApiKey(e.target.value);
              setClearLlmApiKey(false);
            }}
            placeholder={
              initial.hasLlmApiKey
                ? "Kosongkan untuk mempertahankan kunci saat ini"
                : "sk-…"
            }
            className={cn(inputClass, "pr-20")}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs"
          >
            {showKey ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>
      </label>
      <label className="block">
        <span className="text-muted-foreground text-xs">Model</span>
        <input
          value={llmModel}
          onChange={(e) => setLlmModel(e.target.value)}
          placeholder="gpt-4o-mini"
          className={inputClass}
        />
      </label>

      {initial.hasLlmApiKey && !clearLlmApiKey && (
        <button
          type="button"
          onClick={() => {
            setLlmApiKey("");
            setClearLlmApiKey(true);
          }}
          className="text-destructive inline-flex w-fit min-h-11 items-center rounded-md px-2 text-xs hover:underline md:min-h-9"
        >
          Hapus kunci API
        </button>
      )}
      {clearLlmApiKey && (
        <p className="text-destructive text-xs">
          Kunci API akan dihapus saat menyimpan.
        </p>
      )}

      {error && (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          role="alert"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      {success && (
        <div
          className="border-accent/40 bg-accent/10 text-accent flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          Pengaturan AI disimpan.
        </div>
      )}
      {testResult && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            testResult.ok
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
          role="status"
        >
          {testResult.ok ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          )}
          {testResult.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="cta" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            "Simpan"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={test}
          disabled={testing || (!llmBaseUrl.trim() && !initial.hasLlmApiKey)}
        >
          {testing ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            "Tes AI"
          )}
        </Button>
      </div>
    </div>
  );
}
