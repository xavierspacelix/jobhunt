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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MatchDialog } from "@/components/match-dialog"

type Source = "GLINTS" | "JOBSTREET"

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

export function JobFetcher() {
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
      if (res.ok) {
        setTrackedIds((prev) => [...prev, jobId])
      }
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
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {draft && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SourceBadge source={draft.source} />
              <span className="max-w-[16rem] truncate text-xs text-muted-foreground">
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
                {draft.description || "—"}
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

          <div className="mt-5 flex justify-end gap-2">
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {job.title}
                      </span>
                      <SourceBadge source={job.source} />
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
                      {[job.company, job.location].filter(Boolean).join(" · ") ||
                        "—"}
                      {job.salary ? ` · ${job.salary}` : ""}
                    </p>
                    {job.postedAt && (
                      <p className="text-xs text-muted-foreground">
                        Diposting{" "}
                        {new Date(job.postedAt).toLocaleDateString("id-ID")}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToTracker(job.id)}
                        disabled={addingId === job.id}
                      >
                        {addingId === job.id ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <ListChecksIcon className="size-3.5" />
                        )}
                        Tracker
                      </Button>
                    )}
                    <a
                      href={job.sourceUrl}
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
                      onClick={() => setDetailJob(job)}
                    >
                      <EyeIcon className="size-4" />
                    </Button>
                    <MatchDialog
                      jobId={job.id}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-indigo-600 hover:text-indigo-600"
                        >
                          <SparklesIcon className="size-3.5" />
                          Cek
                        </Button>
                      }
                    />
                    {confirmDeleteId === job.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === job.id}
                        >
                          Batal
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-600"
                          onClick={() => handleDeleteJob(job.id)}
                          disabled={deletingId === job.id}
                        >
                          {deletingId === job.id ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : null}
                          Hapus
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus lowongan"
                        onClick={() => setConfirmDeleteId(job.id)}
                        disabled={deletingId === job.id}
                      >
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
