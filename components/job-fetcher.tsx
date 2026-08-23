"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  SearchIcon,
  SaveIcon,
  ExternalLinkIcon,
  Loader2Icon,
  XIcon,
  BriefcaseIcon,
  ListChecksIcon,
  Trash2Icon,
  EyeIcon,
  SparklesIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CircleIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SearchEvent } from "@/lib/job-search"
import { MatchDialog } from "@/components/match-dialog"

type Source = "GLINTS" | "JOBSTREET"

const LOCATION_CHIPS: { label: string; value: string }[] = [
  { label: "Semua Indonesia", value: "" },
  { label: "Jakarta", value: "Jakarta" },
  { label: "Bandung", value: "Bandung" },
  { label: "Surabaya", value: "Surabaya" },
  { label: "Tangerang", value: "Tangerang" },
  { label: "Remote", value: "Remote" },
]

interface CompanyDetails {
  name?: string | null
  industry?: string | null
  size?: string | null
  website?: string | null
  linkedin?: string | null
  instagram?: string | null
  twitter?: string | null
  facebook?: string | null
  address?: string | null
  about?: string | null
}

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
  employmentType: string
  experience: string
  education: string
  category: string
  recruiter: string
  skills: string[]
  externalJobId: string
  shareToken: string
  companyRefId: string
  companyDetails: CompanyDetails | null
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
  description?: string | null
  employmentType?: string | null
  experience?: string | null
  education?: string | null
  category?: string | null
  recruiter?: string | null
  skills?: string[]
  externalJobId?: string | null
  shareToken?: string | null
  companyRefId?: string | null
  companyDetails?: CompanyDetails | null
  matchScore?: number | null
  origin?: "auto" | "manual"
}

interface ScrapeJobPayload {
  title: string
  company: string
  location: string | null
  salary: string | null
  source: Source
  sourceUrl: string
  description: string | null
  postedAt: string | null
  employmentType: string | null
  experience: string | null
  education: string | null
  category: string | null
  recruiter: string | null
  skills: string[]
  externalJobId: string | null
  shareToken: string | null
  companyRefId: string | null
  companyDetails: CompanyDetails | null
}

interface ScrapeResult {
  job: ScrapeJobPayload
  match: {
    score: number
    matchedSkills: string[]
    missingSkills: string[]
    source: "ai" | "heuristic"
  }
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

function OriginPill({ origin }: { origin?: "auto" | "manual" }) {
  if (!origin) return null
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        origin === "auto"
          ? "bg-indigo-100 text-indigo-700"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {origin === "auto" ? "Auto" : "Manual"}
    </span>
  )
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)"
  if (score >= 40) return "var(--color-warning)"
  return "var(--color-destructive)"
}

function Row({
  label,
  value,
  href,
}: {
  label: string
  value?: string | null
  href?: string | null
}) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="break-all text-indigo-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </dd>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

function JobSkeleton() {
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-2/5 rounded bg-muted animate-pulse" />
          <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
          <div className="flex gap-1.5 pt-1">
            <div className="h-4 w-14 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-10 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </li>
  )
}

export function JobFetcher({ defaultKeywords }: { defaultKeywords?: string[] }) {
  const [url, setUrl] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [jobs, setJobs] = React.useState<SavedJob[]>([])
  const [trackedIds, setTrackedIds] = React.useState<string[]>([])
  const [addingId, setAddingId] = React.useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [detailJob, setDetailJob] = React.useState<SavedJob | null>(null)
  const [tab, setTab] = React.useState<"saved" | "manual" | "scrape">("saved")
  const [searchInput, setSearchInput] = React.useState(
    defaultKeywords?.join(", ") ?? "",
  )
  const [location, setLocation] = React.useState("")
  const [recommending, setRecommending] = React.useState(false)
  const [recommendError, setRecommendError] = React.useState<string | null>(null)
  const [recommendSummary, setRecommendSummary] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [searchLog, setSearchLog] = React.useState<
    { id: number; message: string; kind: "info" | "ok" | "error" | "step" }[]
  >([])
  const [scrapeResults, setScrapeResults] = React.useState<ScrapeResult[]>([])
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [savedKeys, setSavedKeys] = React.useState<string[]>([])
  const [jobsLoading, setJobsLoading] = React.useState(true)

  const loadJobs = React.useCallback(async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/applications"),
      ])
      if (jobsRes.ok) {
        const data = await jobsRes.json()
        setJobs(data.jobs ?? [])
      }
      if (appsRes.ok) {
        const data = await appsRes.json()
        const ids = (data.applications ?? [])
          .map((a: { job?: { id: string } }) => a.job?.id)
          .filter(Boolean) as string[]
        setTrackedIds(ids)
      }
    } catch {
    } finally {
      setJobsLoading(false)
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
        employmentType: data.employmentType ?? "",
        experience: data.experience ?? "",
        education: data.education ?? "",
        category: data.category ?? "",
        recruiter: data.recruiter ?? "",
        skills: data.skills ?? [],
        externalJobId: data.externalJobId ?? "",
        shareToken: data.shareToken ?? "",
        companyRefId: data.companyRefId ?? "",
        companyDetails: data.companyDetails ?? null,
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
          employmentType: draft.employmentType || undefined,
          experience: draft.experience || undefined,
          education: draft.education || undefined,
          category: draft.category || undefined,
          recruiter: draft.recruiter || undefined,
          skills: draft.skills,
          externalJobId: draft.externalJobId || undefined,
          shareToken: draft.shareToken || undefined,
          companyRefId: draft.companyRefId || undefined,
          companyDetails: draft.companyDetails || undefined,
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

  async function handleAddToTracker(jobId: string) {
    if (trackedIds.includes(jobId)) return
    setAddingId(jobId)
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId }),
      })
      if (res.ok) setTrackedIds((prev) => [...prev, jobId])
    } finally {
      setAddingId(null)
    }
  }

  async function handleDeleteJob(jobId: string) {
    setDeletingId(jobId)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" })
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
        setTrackedIds((prev) => prev.filter((id) => id !== jobId))
        setConfirmDeleteId(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRecommend() {
    setRecommending(true)
    setRecommendError(null)
    try {
      const res = await fetch("/api/jobs/recommend-keywords", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        if (data.keywords?.length) setSearchInput(data.keywords.join(", "))
        setRecommendSummary(data.summary ?? "")
      } else {
        setRecommendError(data.error ?? "Gagal memuat rekomendasi")
      }
    } catch {
      setRecommendError("Terjadi kesalahan saat memuat rekomendasi")
    } finally {
      setRecommending(false)
    }
  }

  async function handleSearch() {
    if (searching) return
    setSearching(true)
    setSearchLog([])
    setScrapeResults([])
    setRecommendError(null)
    let logId = 0
    const push = (
      message: string,
      kind: "info" | "ok" | "error" | "step" = "info",
    ) => setSearchLog((prev) => [...prev, { id: logId++, message, kind }])

    const applyEvent = (ev: SearchEvent) => {
      switch (ev.type) {
        case "start":
          push("Memulai pencarian…", "step")
          break
        case "search":
        case "detail":
          push(ev.message, "step")
          break
        case "links":
          push(ev.message, "info")
          break
        case "result":
          setScrapeResults((prev) => [
            ...prev,
            { job: ev.job as unknown as ScrapeJobPayload, match: ev.match },
          ])
          break
        case "done":
          setSearchLog([{ id: -1, message: ev.message, kind: "ok" }])
          break
        case "error":
          push(ev.message, "error")
          break
      }
    }

    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keywords: searchInput, location }),
      })
      if (!res.ok || !res.body) {
        push("Gagal memulai pencarian.", "error")
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split("\n\n")
        buf = parts.pop() ?? ""
        for (const part of parts) {
          const text = part.trim()
          if (!text.startsWith("data:")) continue
          const json = text.slice(5).trim()
          if (!json) continue
          let ev: SearchEvent
          try {
            ev = JSON.parse(json) as SearchEvent
          } catch {
            continue
          }
          applyEvent(ev)
        }
      }
    } catch {
      push("Koneksi terputus saat mencari.", "error")
    } finally {
      setSearching(false)
    }
  }

  async function handleSaveScrape(r: ScrapeResult) {
    const key = r.job.sourceUrl
    if (savedKeys.includes(key)) return
    setSavingKey(key)
    try {
      const res = await fetch("/api/jobs/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(r.job),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan lowongan")
        return
      }
      setSavedKeys((prev) => [...prev, key])
      await loadJobs()
    } catch {
      setError("Terjadi kesalahan saat menyimpan")
    } finally {
      setSavingKey(null)
    }
  }

  const displayJobs = jobs
  const cd = draft?.companyDetails
  const jobCoreRows = draft
    ? [
        { label: "Title", value: draft.title },
        { label: "Company", value: draft.company },
        { label: "Company ID", value: draft.companyRefId },
        { label: "Job ID", value: draft.externalJobId },
        { label: "Share Token", value: draft.shareToken },
        { label: "Salary", value: draft.salary },
        { label: "Type", value: draft.employmentType },
        { label: "Experience", value: draft.experience },
        { label: "Education", value: draft.education },
        { label: "Location", value: draft.location },
        { label: "Category", value: draft.category },
        { label: "Recruiter", value: draft.recruiter },
      ]
    : []
  const companyRows = cd
    ? [
        { label: "Name", value: cd.name },
        { label: "Industry", value: cd.industry },
        { label: "Size", value: cd.size },
        { label: "Website", value: cd.website, href: cd.website },
        { label: "LinkedIn", value: cd.linkedin, href: cd.linkedin },
        { label: "Instagram", value: cd.instagram, href: cd.instagram },
        { label: "Twitter", value: cd.twitter, href: cd.twitter },
        { label: "Facebook", value: cd.facebook, href: cd.facebook },
        { label: "Office Address", value: cd.address },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {(
          [
            ["saved", `Tersimpan (${jobs.length})`],
            ["manual", "Input Manual (Link)"],
            ["scrape", "Cari (Scrape)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === key
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "scrape" && (
        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Cari Lowongan (Scrape)
              </h2>
              <p className="text-sm text-muted-foreground">
                Biarkan AI menyusun kata kunci dari profil CV Anda, atau ketik
                sendiri. Hasil tidak otomatis tersimpan — pilih yang ingin diambil.
              </p>
            </div>
            <SparklesIcon className="size-10 text-accent" />
          </div>

          <Button
            variant="outline"
            className="mt-4"
            onClick={handleRecommend}
            disabled={recommending}
          >
            {recommending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            {recommending ? "Menganalisis profil…" : "Cari Rekomendasi (AI)"}
          </Button>
          {recommendError && (
            <p className="mt-2 text-sm text-red-600">{recommendError}</p>
          )}
          {recommendSummary && (
            <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              {recommendSummary}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="mis. React, Node.js (skill/kata kunci)"
              className="flex-1"
              disabled={searching}
            />
            <Button
              onClick={handleSearch}
              disabled={searching || !searchInput.trim()}
            >
              {searching ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SearchIcon className="size-4" />
              )}
              {searching ? "Mencari…" : "Cari"}
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <label
              htmlFor="job-location"
              className="text-sm font-medium text-foreground"
            >
              Lokasi
            </label>
            <Input
              id="job-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="mis. Jakarta, Bandung, Remote"
              className="flex-1"
              disabled={searching}
            />
            <div className="flex flex-wrap gap-1.5">
              {LOCATION_CHIPS.map((chip) => {
                const active = location === chip.value
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setLocation(chip.value)}
                    disabled={searching}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-border bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Hanya menampilkan lowongan ≤30 hari &amp; masih dibuka.
            </p>
          </div>

          {searchLog.length > 0 && (
            <div className="mt-4">
              <span className="text-sm font-medium text-foreground">
                Proses
              </span>
              <ul className="mt-2 space-y-1.5">
                {searchLog.map((l) => (
                  <li key={l.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0">
                      {l.kind === "ok" ? (
                        <CheckCircle2Icon className="size-4 text-accent" />
                      ) : l.kind === "error" ? (
                        <XCircleIcon className="size-4 text-destructive" />
                      ) : searching ? (
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <CircleIcon className="size-4 text-muted-foreground" />
                      )}
                    </span>
                    <span
                      className={
                        l.kind === "error"
                          ? "text-destructive"
                          : l.kind === "ok"
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }
                    >
                      {l.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scrapeResults.length > 0 && (
            <div className="mt-5">
              <span className="text-sm font-medium text-foreground">
                Hasil Pencarian ({scrapeResults.length})
              </span>
              <ul className="mt-2 flex flex-col gap-3">
                {scrapeResults.map((r) => {
                  const saved = savedKeys.includes(r.job.sourceUrl)
                  const key = r.job.sourceUrl
                  return (
                    <li
                      key={key}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {r.job.title}
                            </span>
                            <SourceBadge source={r.job.source} />
                            <span
                              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                              style={{
                                color: scoreColor(r.match.score),
                                borderColor: scoreColor(r.match.score),
                                backgroundColor: `color-mix(in srgb, ${scoreColor(r.match.score)} 12%, transparent)`,
                              }}
                            >
                              {r.match.score}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {[r.job.company, r.job.location].filter(Boolean).join(" · ") ||
                              "—"}
                            {r.job.salary ? ` · ${r.job.salary}` : ""}
                          </p>
                          {r.job.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {r.job.skills.slice(0, 8).map((s) => (
                                <span
                                  key={s}
                                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={r.job.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                          >
                            Buka <ExternalLinkIcon className="size-3.5" />
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Lihat detail"
                            onClick={() =>
                              setDetailJob({
                                id: key,
                                createdAt: r.job.postedAt ?? "",
                                title: r.job.title,
                                company: r.job.company,
                                location: r.job.location,
                                salary: r.job.salary,
                                source: r.job.source,
                                sourceUrl: r.job.sourceUrl,
                                postedAt: r.job.postedAt,
                                description: r.job.description ?? undefined,
                                employmentType: r.job.employmentType,
                                experience: r.job.experience,
                                education: r.job.education,
                                category: r.job.category,
                                recruiter: r.job.recruiter,
                                skills: r.job.skills,
                                externalJobId: r.job.externalJobId,
                                shareToken: r.job.shareToken,
                                companyRefId: r.job.companyRefId,
                                companyDetails: r.job.companyDetails,
                              })
                            }
                          >
                            <EyeIcon className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveScrape(r)}
                            disabled={saved || savingKey === key}
                          >
                            {savingKey === key ? (
                              <Loader2Icon className="size-3.5 animate-spin" />
                            ) : (
                              <SaveIcon className="size-3.5" />
                            )}
                            {saved ? "Tersimpan" : savingKey === key ? "Menyimpan…" : "Simpan"}
                          </Button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab === "manual" && (
        <>
          <form onSubmit={handleFetch} className="rounded-xl border border-border bg-card p-5">
            <label htmlFor="job-url" className="mb-2 block text-sm font-medium text-foreground">
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
                {loading ? "Mengambil…" : "Ambil"}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </form>

          {!draft && loading && (
            <ul className="mt-4 flex flex-col gap-3">
              <JobSkeleton />
            </ul>
          )}

          {draft && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SourceBadge source={draft.source} />
                  <span className="max-w-[16rem] truncate text-xs text-muted-foreground">
                    {draft.sourceUrl}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDraft(null)} aria-label="Tutup">
                  <XIcon className="size-4" />
                </Button>
              </div>

              {draft.fetchError && (
                <p className="mb-3 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                  {draft.fetchError}
                </p>
              )}

              <div className="space-y-5">
                <Section title="Job Core">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {jobCoreRows.map((r) => (
                      <Row key={r.label} label={r.label} value={r.value} />
                    ))}
                  </dl>
                </Section>

                {draft.skills.length > 0 && (
                  <Section title="Skills Required">
                    <div className="flex flex-wrap gap-2">
                      {draft.skills.map((s) => (
                        <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title="Job Description">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {draft.description || "—"}
                  </p>
                </Section>

                {cd && companyRows.some((r) => r.value) && (
                  <Section title="Company Details">
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                      {companyRows.map((r) => (
                        <Row key={r.label} label={r.label} value={r.value} href={r.href} />
                      ))}
                    </dl>
                    {cd.about && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {cd.about}
                      </p>
                    )}
                  </Section>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={saving || !draft.title.trim()}>
                  {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
                  {saving ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "saved" && (
        <div>
          {jobsLoading && displayJobs.length === 0 ? (
            <ul className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <JobSkeleton key={i} />
              ))}
            </ul>
          ) : displayJobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <BriefcaseIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada lowongan tersimpan.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {displayJobs.map((job) => (
                <li key={job.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{job.title}</span>
                        <SourceBadge source={job.source} />
                        <OriginPill origin={job.origin} />
                        {job.matchScore != null && (
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                            style={{
                              color: scoreColor(job.matchScore),
                              borderColor: scoreColor(job.matchScore),
                              backgroundColor: `color-mix(in srgb, ${scoreColor(job.matchScore)} 12%, transparent)`,
                            }}
                          >
                            {job.matchScore}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[job.company, job.location].filter(Boolean).join(" · ") || "—"}
                        {job.salary ? ` · ${job.salary}` : ""}
                      </p>
                      {job.postedAt && (
                        <p className="text-xs text-muted-foreground">
                          Diposting {new Date(job.postedAt).toLocaleDateString("id-ID")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {trackedIds.includes(job.id) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ListChecksIcon className="size-3.5" />
                          Di tracker
                        </span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleAddToTracker(job.id)} disabled={addingId === job.id}>
                          {addingId === job.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <ListChecksIcon className="size-3.5" />}
                          {addingId === job.id ? "Menambahkan…" : "Tracker"}
                        </Button>
                      )}
                      <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
                        Buka <ExternalLinkIcon className="size-3.5" />
                      </a>
                      <Button variant="ghost" size="icon" aria-label="Lihat detail" onClick={() => setDetailJob(job)}>
                        <EyeIcon className="size-4" />
                      </Button>
                      <MatchDialog
                        jobId={job.id}
                        trigger={
                          <Button variant="ghost" size="sm" className="gap-1 text-indigo-600 hover:text-indigo-600">
                            <SparklesIcon className="size-3.5" />
                            Cek
                          </Button>
                        }
                      />
                      {confirmDeleteId === job.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={deletingId === job.id}>
                            Batal
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600" onClick={() => handleDeleteJob(job.id)} disabled={deletingId === job.id}>
                            {deletingId === job.id ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                            {deletingId === job.id ? "Menghapus…" : "Hapus"}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" aria-label="Hapus lowongan" onClick={() => setConfirmDeleteId(job.id)} disabled={deletingId === job.id}>
                          <Trash2Icon className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <JobDetailSheet job={detailJob} onClose={() => setDetailJob(null)} />
    </div>
  )
}

function JobDetailSheet({
  job,
  onClose,
}: {
  job: SavedJob | null
  onClose: () => void
}) {
  const cd = job?.companyDetails ?? null
  const jobCoreRows = job
    ? [
        { label: "Title", value: job.title },
        { label: "Company", value: job.company },
        { label: "Company ID", value: job.companyRefId },
        { label: "Job ID", value: job.externalJobId },
        { label: "Share Token", value: job.shareToken },
        { label: "Salary", value: job.salary },
        { label: "Type", value: job.employmentType },
        { label: "Experience", value: job.experience },
        { label: "Education", value: job.education },
        { label: "Location", value: job.location },
        { label: "Category", value: job.category },
        { label: "Recruiter", value: job.recruiter },
      ]
    : []

  const companyRows = cd
    ? [
        { label: "Name", value: cd.name },
        { label: "Industry", value: cd.industry },
        { label: "Size", value: cd.size },
        { label: "Website", value: cd.website, href: cd.website },
        { label: "LinkedIn", value: cd.linkedin, href: cd.linkedin },
        { label: "Instagram", value: cd.instagram, href: cd.instagram },
        { label: "Twitter", value: cd.twitter, href: cd.twitter },
        { label: "Facebook", value: cd.facebook, href: cd.facebook },
        { label: "Office Address", value: cd.address },
      ]
    : []

  return (
    <Sheet open={!!job} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="gap-0">
        {job ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SourceBadge source={job.source} />
                <span className="max-w-[16rem] truncate text-xs text-muted-foreground">
                  {job.sourceUrl}
                </span>
              </div>
              <SheetTitle className="line-clamp-2">{job.title}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <Section title="Job Core">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {jobCoreRows.map((r) => (
                    <Row key={r.label} label={r.label} value={r.value} />
                  ))}
                </dl>
              </Section>

              {job.skills && job.skills.length > 0 && (
                <Section title="Skills Required">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Job Description">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {job.description || "—"}
                </p>
              </Section>

                {cd && companyRows.some((r) => r.value) && (
                <Section title="Company Details">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {companyRows.map((r) => (
                      <Row
                        key={r.label}
                        label={r.label}
                        value={r.value}
                        href={r.href}
                      />
                    ))}
                  </dl>
                  {cd.about && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {cd.about}
                    </p>
                  )}
                </Section>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
