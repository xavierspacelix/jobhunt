"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  SearchIcon,
  SaveIcon,
  ExternalLinkIcon,
  Loader2Icon,
  XIcon,
  BriefcaseIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Source = "GLINTS" | "JOBSTREET"

interface Draft {
  title: string
  company: string
  location: string
  salary: string
  source: Source
  sourceUrl: string
  description: string
  postedAt: string
  fetchError: string | null
}

interface SavedJob {
  id: string
  title: string
  company: string | null
  location: string | null
  salary: string | null
  source: Source
  sourceUrl: string
  postedAt: string | null
  createdAt: string
}

function SourceBadge({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        source === "GLINTS"
          ? "bg-indigo-100 text-indigo-700"
          : "bg-emerald-100 text-emerald-700",
      )}
    >
      {source === "GLINTS" ? "Glints" : "Jobstreet"}
    </span>
  )
}

export function JobFetcher() {
  const [url, setUrl] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [jobs, setJobs] = React.useState<SavedJob[]>([])

  const loadJobs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/jobs")
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs()
  }, [loadJobs])

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDraft(null)
    try {
      const res = await fetch("/api/jobs/fetch-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal mengambil lowongan")
        return
      }
      setDraft({
        title: data.title ?? "",
        company: data.company ?? "",
        location: data.location ?? "",
        salary: data.salary ?? "",
        source: data.source,
        sourceUrl: data.sourceUrl,
        description: data.description ?? "",
        postedAt: (data.postedAt ?? "").slice(0, 10),
        fetchError: data.fetchError ?? null,
      })
    } catch {
      setError("Terjadi kesalahan saat mengambil lowongan")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          company: draft.company,
          location: draft.location,
          salary: draft.salary,
          source: draft.source,
          sourceUrl: draft.sourceUrl,
          description: draft.description,
          postedAt: draft.postedAt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan lowongan")
        return
      }
      setDraft(null)
      setUrl("")
      await loadJobs()
    } catch {
      setError("Terjadi kesalahan saat menyimpan")
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    if (!draft) return
    setDraft({ ...draft, [key]: value })
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleFetch}
        className="rounded-xl border border-border bg-card p-5"
      >
        <label
          htmlFor="job-url"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          URL Lowongan
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="job-url"
            placeholder="https://www.glints.com/id/jobs/... atau jobstreet.co.id/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SearchIcon className="size-4" />
            )}
            Ambil
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </form>

      {draft && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SourceBadge source={draft.source} />
              <span className="text-xs text-muted-foreground">
                {draft.sourceUrl}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDraft(null)}
              aria-label="Tutup"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          {draft.fetchError && (
            <p className="mb-3 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              {draft.fetchError}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Judul Posisi *">
              <Input
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="mis. Frontend Engineer"
              />
            </Field>
            <Field label="Perusahaan">
              <Input
                value={draft.company}
                onChange={(e) => update("company", e.target.value)}
              />
            </Field>
            <Field label="Lokasi">
              <Input
                value={draft.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </Field>
            <Field label="Gaji">
              <Input
                value={draft.salary}
                onChange={(e) => update("salary", e.target.value)}
                placeholder="mis. Rp 10-15 juta"
              />
            </Field>
            <Field label="Tanggal Posting">
              <Input
                type="date"
                value={draft.postedAt}
                onChange={(e) => update("postedAt", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Deskripsi">
            <Textarea
              className="min-h-40"
              value={draft.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving || !draft.title.trim()}>
              {saving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              Simpan
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Tersimpan ({jobs.length})
        </h2>
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <BriefcaseIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Belum ada lowongan tersimpan.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {job.title}
                      </span>
                      <SourceBadge source={job.source} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[job.company, job.location]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {job.salary ? ` · ${job.salary}` : ""}
                    </p>
                    {job.postedAt && (
                      <p className="text-xs text-muted-foreground">
                        Diposting{" "}
                        {new Date(job.postedAt).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                  >
                    Buka <ExternalLinkIcon className="size-3.5" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}
