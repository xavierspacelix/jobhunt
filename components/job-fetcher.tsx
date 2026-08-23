"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
} from "lucide-react";
import { MatchDialog } from "@/components/match-dialog";

type Source = "GLINTS" | "JOBSTREET";

const HANDOFF_HOSTS = ["glints.com", "jobstreet.co.id", "jobstreet.com"];

function sourceFromUrl(value: string): Source | null {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "glints.com" || host.endsWith(".glints.com")) return "GLINTS";
    if (
      host === "jobstreet.co.id" ||
      host.endsWith(".jobstreet.co.id") ||
      host === "jobstreet.com" ||
      host.endsWith(".jobstreet.com")
    ) {
      return "JOBSTREET";
    }
  } catch {
    return null;
  }
  return null;
}

function emptyDraft(
  source: Source,
  sourceUrl: string,
  fetchError: string,
): Draft {
  return {
    title: "",
    company: "",
    location: "",
    salary: "",
    source,
    sourceUrl,
    description: "",
    postedAt: "",
    fetchError,
    employmentType: "",
    experience: "",
    education: "",
    category: "",
    recruiter: "",
    skills: [],
    externalJobId: "",
    shareToken: "",
    companyRefId: "",
    companyDetails: null,
  };
}

export function getExtensionHandoff(search: string): string | null {
  const params = new URLSearchParams(search);
  if (params.get("source") !== "extension") return null;

  const value = params.get("url");
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const supported = HANDOFF_HOSTS.some(
      (host) =>
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      !supported
    ) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

interface CompanyDetails {
  name?: string | null;
  industry?: string | null;
  size?: string | null;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  address?: string | null;
  about?: string | null;
}

interface Draft {
  title: string;
  company: string;
  location: string;
  salary: string;
  source: Source;
  sourceUrl: string;
  description: string;
  postedAt: string;
  fetchError: string | null;
  employmentType: string;
  experience: string;
  education: string;
  category: string;
  recruiter: string;
  skills: string[];
  externalJobId: string;
  shareToken: string;
  companyRefId: string;
  companyDetails: CompanyDetails | null;
  previewToken?: string;
}

interface SavedJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  source: Source;
  sourceUrl: string;
  postedAt: string | null;
  createdAt: string;
  description?: string | null;
  employmentType?: string | null;
  experience?: string | null;
  education?: string | null;
  category?: string | null;
  recruiter?: string | null;
  skills?: string[];
  externalJobId?: string | null;
  shareToken?: string | null;
  companyRefId?: string | null;
  companyDetails?: CompanyDetails | null;
  matchScore?: number | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  origin?: "auto" | "manual" | "both" | "extension";
  tracked?: boolean;
}

function SourceBadge({ source }: { source: Source }) {
  const color =
    source === "GLINTS" ? "var(--color-success)" : "var(--color-info)";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {source === "GLINTS" ? "Glints" : "Jobstreet"}
    </span>
  );
}

function OriginPill({
  origin,
}: {
  origin?: "auto" | "manual" | "both" | "extension";
}) {
  if (!origin) return null;
  const color =
    origin === "extension"
      ? "var(--color-warning)"
      : origin === "auto" || origin === "both"
        ? "var(--color-muted-status)"
        : "var(--foreground)";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {origin === "extension"
        ? "Extension"
        : origin === "both"
          ? "Manual + pencarian"
          : origin === "auto"
            ? "Pencarian"
            : "Manual"}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--destructive)";
}

function MatchScoreBlock({
  score,
  matchedSkills,
  missingSkills,
}: {
  score: number;
  matchedSkills?: string[];
  missingSkills?: string[];
}) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-foreground text-sm font-medium">
        Skor kecocokan:{" "}
        <span
          className="rounded-full border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums"
          style={{
            color: scoreColor(score),
            borderColor: scoreColor(score),
            backgroundColor: `color-mix(in srgb, ${scoreColor(score)} 12%, transparent)`,
          }}
        >
          {score}/100
        </span>
      </p>
      {matchedSkills && matchedSkills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-foreground text-xs font-medium">Cocok:</span>
          {matchedSkills.map((skill) => (
            <span
              key={`matched-${skill}`}
              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      {missingSkills && missingSkills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-foreground text-xs font-medium">Kurang:</span>
          {missingSkills.map((skill) => (
            <span
              key={`missing-${skill}`}
              className="border-destructive/40 text-destructive rounded-full border px-2.5 py-0.5 text-xs"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MatchScoreBadge({
  score,
}: {
  score: number | null | undefined;
}) {
  if (score == null) {
    return (
      <span className="text-muted-foreground inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-xs font-medium">
        Belum dimatch
      </span>
    );
  }
  const color = scoreColor(score);
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums"
      style={{
        color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
      title="Skor kecocokan AI"
    >
      AI {score}
    </span>
  );
}

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground text-sm">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent inline-flex min-h-11 items-center break-all hover:underline md:min-h-9"
          >
            {value}
          </a>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-foreground mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function JobSkeleton() {
  return (
    <li className="border-border bg-card rounded-xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2.5">
          <div className="bg-muted h-4 w-2/5 animate-pulse rounded motion-reduce:animate-none" />
          <div className="bg-muted h-3 w-3/5 animate-pulse rounded motion-reduce:animate-none" />
          <div className="flex gap-1.5 pt-1">
            <div className="bg-muted h-4 w-14 animate-pulse rounded-full motion-reduce:animate-none" />
            <div className="bg-muted h-4 w-10 animate-pulse rounded-full motion-reduce:animate-none" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted h-8 w-20 animate-pulse rounded-md motion-reduce:animate-none" />
          <div className="bg-muted h-8 w-8 animate-pulse rounded-md motion-reduce:animate-none" />
        </div>
      </div>
    </li>
  );
}

export function JobFetcher() {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [jobs, setJobs] = React.useState<SavedJob[]>([]);
  const [trackedIds, setTrackedIds] = React.useState<string[]>([]);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [detailJob, setDetailJob] = React.useState<SavedJob | null>(null);
  const [tab, setTab] = React.useState<"saved" | "manual">("saved");
  const [jobsLoading, setJobsLoading] = React.useState(true);
  const [jobsError, setJobsError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [pageLoading, setPageLoading] = React.useState(false);
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [matchFilter, setMatchFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const filtersRef = React.useRef({ source: "all", match: "all", q: "" });
  const searchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handoffConsumed = React.useRef(false);

  const loadJobs = React.useCallback(async (nextPage = 1) => {
    setJobsError(null);
    setPageLoading(true);
    const f = filtersRef.current;
    const query = new URLSearchParams({ page: String(nextPage), limit: "10" });
    if (f.source && f.source !== "all") query.set("source", f.source);
    if (f.match && f.match !== "all") query.set("match", f.match);
    if (f.q) query.set("q", f.q);
    try {
      const jobsRes = await fetch(`/api/jobs?${query.toString()}`);
      if (!jobsRes.ok) throw new Error("load failed");
      const jobsData = await jobsRes.json();
      const loadedJobs = (jobsData.jobs ?? []) as SavedJob[];
      setJobs(loadedJobs);
      setTrackedIds(
        loadedJobs.filter((job) => job.tracked).map((job) => job.id),
      );
      setPage(nextPage);
      setTotalPages(jobsData.totalPages ?? 1);
    } catch {
      setJobsError("Lowongan gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setPageLoading(false);
      setJobsLoading(false);
    }
  }, []);

  function changeSource(value: string) {
    setSourceFilter(value);
    filtersRef.current = { ...filtersRef.current, source: value };
    setPage(1);
    void loadJobs(1);
  }

  function changeMatch(value: string) {
    setMatchFilter(value);
    filtersRef.current = { ...filtersRef.current, match: value };
    setPage(1);
    void loadJobs(1);
  }

  function changeSearch(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      filtersRef.current = { ...filtersRef.current, q: value.trim() };
      setPage(1);
      void loadJobs(1);
    }, 300);
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs();
  }, [loadJobs]);

  const fetchPreview = React.useCallback(async (jobUrl: string) => {
    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch("/api/jobs/fetch-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: jobUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "Gagal mengambil lowongan";
        const source = sourceFromUrl(jobUrl);
        if (source && res.status === 422) {
          setDraft(
            emptyDraft(
              source,
              jobUrl,
              `${message}. Lengkapi data lowongan secara manual.`,
            ),
          );
        } else {
          setError(message);
        }
        return;
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
        previewToken:
          typeof data.previewToken === "string" ? data.previewToken : undefined,
      });
    } catch {
      setError("Terjadi kesalahan saat mengambil lowongan");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (handoffConsumed.current) return;
    handoffConsumed.current = true;

    const handoffUrl = getExtensionHandoff(window.location.search);
    if (!handoffUrl) return;

    React.startTransition(() => {
      setTab("manual");
      setUrl(handoffUrl);
    });

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("url");
    currentUrl.searchParams.delete("source");
    window.history.replaceState(
      window.history.state,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
    queueMicrotask(() => void fetchPreview(handoffUrl));
  }, [fetchPreview]);

  function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    void fetchPreview(url);
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
            ...(key !== "previewToken" && current.previewToken
              ? {
                  previewToken: undefined,
                  fetchError:
                    "Preview telah diubah dan akan disimpan sebagai data privat untuk akun Anda.",
                }
              : {}),
          }
        : current,
    );
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
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
          previewToken: draft.previewToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan lowongan");
        return;
      }
      setDraft(null);
      setUrl("");
      await loadJobs();
    } catch {
      setError("Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToTracker(jobId: string) {
    if (trackedIds.includes(jobId)) return;
    setAddingId(jobId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) {
        setTrackedIds((prev) => [...prev, jobId]);
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, tracked: true } : job,
          ),
        );
      } else {
        const data = await res.json().catch(() => null);
        setJobsError(data?.error ?? "Lowongan gagal ditambahkan ke tracker.");
      }
    } catch {
      setJobsError(
        "Lowongan gagal ditambahkan ke tracker. Periksa koneksi Anda.",
      );
    } finally {
      setAddingId(null);
    }
  }

  async function handleDeleteJob(jobId: string) {
    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        const data = (await res.json()) as {
          retained?: boolean;
          retainedForApplication?: boolean;
        };
        const retained =
          data.retained === true || data.retainedForApplication === true;
        if (retained) {
          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId
                ? {
                    ...job,
                    origin: undefined,
                  }
                : job,
            ),
          );
        } else {
          setJobs((prev) => prev.filter((job) => job.id !== jobId));
          setTrackedIds((prev) => prev.filter((id) => id !== jobId));
        }
        setConfirmDeleteId(null);
      } else {
        const data = await res.json().catch(() => null);
        setJobsError(data?.error ?? "Lowongan gagal dihapus. Coba lagi.");
      }
    } catch {
      setJobsError("Lowongan gagal dihapus. Periksa koneksi lalu coba lagi.");
    } finally {
      setDeletingId(null);
    }
  }

  const cd = draft?.companyDetails;
  const companyRows = cd
    ? [
        { label: "Nama", value: cd.name },
        { label: "Industri", value: cd.industry },
        { label: "Ukuran", value: cd.size },
        { label: "Situs web", value: cd.website, href: cd.website },
        { label: "LinkedIn", value: cd.linkedin, href: cd.linkedin },
        { label: "Instagram", value: cd.instagram, href: cd.instagram },
        { label: "Twitter", value: cd.twitter, href: cd.twitter },
        { label: "Facebook", value: cd.facebook, href: cd.facebook },
        { label: "Alamat kantor", value: cd.address },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {tab === "manual" && (
        <>
          <form
            onSubmit={handleFetch}
            className="border-border bg-card rounded-xl border p-5"
          >
            <label
              htmlFor="job-url"
              className="text-foreground mb-2 block text-sm font-medium"
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
                  <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <SearchIcon className="size-4" />
                )}
                {loading ? "Mengambil…" : "Ambil"}
              </Button>
            </div>
            {error && (
              <p className="text-destructive mt-3 text-sm" role="alert">
                {error}
              </p>
            )}
          </form>

          {!draft && loading && (
            <ul className="mt-4 flex flex-col gap-3">
              <JobSkeleton />
            </ul>
          )}

          {draft && (
            <div className="border-border bg-card rounded-xl border p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SourceBadge source={draft.source} />
                  <span className="text-muted-foreground max-w-[16rem] truncate text-xs">
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
                <p className="bg-secondary text-secondary-foreground mb-3 rounded-md px-3 py-2 text-sm">
                  {draft.fetchError}
                </p>
              )}

              <div className="space-y-5">
                <Section title="Detail Lowongan">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["title", "Posisi", true],
                        ["company", "Perusahaan", false],
                        ["location", "Lokasi", false],
                        ["salary", "Gaji", false],
                        ["employmentType", "Tipe pekerjaan", false],
                        ["experience", "Pengalaman", false],
                        ["education", "Pendidikan", false],
                        ["category", "Kategori", false],
                        ["recruiter", "Perekrut", false],
                      ] as const
                    ).map(([key, label, required]) => (
                      <label
                        key={key}
                        className="text-foreground space-y-1 text-sm font-medium"
                      >
                        {label}
                        {required ? " *" : ""}
                        <Input
                          value={draft[key]}
                          required={required}
                          onChange={(event) =>
                            updateDraft(key, event.target.value)
                          }
                        />
                      </label>
                    ))}
                    <label className="text-foreground space-y-1 text-sm font-medium sm:col-span-2">
                      Keahlian (pisahkan dengan koma)
                      <Input
                        value={draft.skills.join(", ")}
                        onChange={(event) =>
                          updateDraft(
                            "skills",
                            event.target.value
                              .split(",")
                              .map((skill) => skill.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </label>
                  </div>
                </Section>

                <Section title="Deskripsi Pekerjaan">
                  <Textarea
                    value={draft.description}
                    onChange={(event) =>
                      updateDraft("description", event.target.value)
                    }
                    className="min-h-40"
                    placeholder="Masukkan deskripsi dan kualifikasi lowongan"
                  />
                </Section>

                {cd && companyRows.some((r) => r.value) && (
                  <Section title="Detail Perusahaan">
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
                      <p className="text-muted-foreground mt-3 text-sm whitespace-pre-wrap">
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
                <Button
                  onClick={handleSave}
                  disabled={saving || !draft.title.trim()}
                >
                  {saving ? (
                    <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <SaveIcon className="size-4" />
                  )}
                  {saving ? "Menyimpan…" : "Simpan"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

       {tab === "saved" && (
         <div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
             <div className="relative flex-1">
               <SearchIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
               <Input
                 value={search}
                 onChange={(e) => changeSearch(e.target.value)}
                 placeholder="Cari judul atau perusahaan"
                 className="pl-8"
                 aria-label="Cari lowongan"
               />
             </div>
             <select
               value={sourceFilter}
               onChange={(e) => changeSource(e.target.value)}
               className="border-border bg-card text-foreground rounded-md px-2 py-2 text-sm"
               aria-label="Filter sumber"
             >
               <option value="all">Semua sumber</option>
               <option value="GLINTS">Glints</option>
               <option value="JOBSTREET">Jobstreet</option>
             </select>
             <select
               value={matchFilter}
               onChange={(e) => changeMatch(e.target.value)}
               className="border-border bg-card text-foreground rounded-md px-2 py-2 text-sm"
               aria-label="Filter skor AI"
             >
               <option value="all">Semua skor</option>
               <option value="high">AI ≥ 70</option>
               <option value="matched">Sudah ada match</option>
               <option value="unmatched">Belum dimatch</option>
             </select>
           </div>
           {jobsError ? (
            <div
              className="border-destructive/40 bg-destructive/10 text-destructive mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm"
              role="alert"
            >
              <span>{jobsError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadJobs()}
              >
                Coba lagi
              </Button>
            </div>
          ) : null}
          {jobsLoading && jobs.length === 0 ? (
            <ul className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <JobSkeleton key={i} />
              ))}
            </ul>
          ) : jobs.length === 0 ? (
            <div className="border-border bg-card/50 flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
              <BriefcaseIcon className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">
                Belum ada lowongan tersimpan atau dilacak.
              </p>
            </div>
          ) : (
            <ul className="divide-border border-border bg-card divide-y overflow-hidden rounded-xl border">
              {jobs.map((job) => (
                <li key={job.id} className="p-3 md:px-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-foreground truncate text-sm font-medium">
                          {job.title}
                        </span>
                        <SourceBadge source={job.source} />
                        <OriginPill origin={job.origin} />
                        <MatchScoreBadge score={job.matchScore} />
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {[job.company, job.location]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {job.salary ? ` · ${job.salary}` : ""}
                        {job.postedAt
                          ? ` · ${new Date(job.postedAt).toLocaleDateString("id-ID")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {trackedIds.includes(job.id) ? (
                        <span className="text-muted-foreground mr-1 inline-flex items-center gap-1 text-xs">
                          <ListChecksIcon className="size-3.5" />
                          Di tracker
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-11 md:size-9"
                          aria-label="Tambahkan ke tracker"
                          onClick={() => handleAddToTracker(job.id)}
                          disabled={addingId === job.id}
                        >
                          {addingId === job.id ? (
                            <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <ListChecksIcon className="size-3.5" />
                          )}
                        </Button>
                      )}
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:bg-muted inline-flex size-11 items-center justify-center rounded-md transition-colors motion-reduce:transition-none md:size-9"
                        aria-label={`Buka ${job.title} di situs sumber`}
                      >
                        <ExternalLinkIcon className="size-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 md:size-9"
                        aria-label={`Lihat detail ${job.title}`}
                        onClick={() => setDetailJob(job)}
                      >
                        <EyeIcon className="size-4" />
                      </Button>
                      {!job.origin ? null : confirmDeleteId === job.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11 md:min-h-9"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deletingId === job.id}
                          >
                            Batal
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive min-h-11 md:min-h-9"
                            onClick={() => handleDeleteJob(job.id)}
                            disabled={deletingId === job.id}
                          >
                            {deletingId === job.id ? (
                              <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" />
                            ) : null}
                            {deletingId === job.id ? "Menghapus…" : "Hapus"}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 md:size-9"
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

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 md:min-h-9"
                  disabled={page <= 1 || pageLoading}
                  onClick={() => void loadJobs(page - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 md:min-h-9"
                  disabled={page >= totalPages || pageLoading}
                  onClick={() => void loadJobs(page + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <JobDetailSheet job={detailJob} onClose={() => setDetailJob(null)} />
    </div>
  );
}

function JobDetailSheet({
  job,
  onClose,
}: {
  job: SavedJob | null;
  onClose: () => void;
}) {
  const cd = job?.companyDetails ?? null;
  const jobCoreRows = job
    ? [
        { label: "Posisi", value: job.title },
        { label: "Perusahaan", value: job.company },
        { label: "ID perusahaan", value: job.companyRefId },
        { label: "ID lowongan", value: job.externalJobId },
        { label: "Token berbagi", value: job.shareToken },
        { label: "Gaji", value: job.salary },
        { label: "Tipe pekerjaan", value: job.employmentType },
        { label: "Pengalaman", value: job.experience },
        { label: "Pendidikan", value: job.education },
        { label: "Lokasi", value: job.location },
        { label: "Kategori", value: job.category },
        { label: "Perekrut", value: job.recruiter },
      ]
    : [];

  const companyRows = cd
    ? [
        { label: "Nama", value: cd.name },
        { label: "Industri", value: cd.industry },
        { label: "Ukuran", value: cd.size },
        { label: "Situs web", value: cd.website, href: cd.website },
        { label: "LinkedIn", value: cd.linkedin, href: cd.linkedin },
        { label: "Instagram", value: cd.instagram, href: cd.instagram },
        { label: "Twitter", value: cd.twitter, href: cd.twitter },
        { label: "Facebook", value: cd.facebook, href: cd.facebook },
        { label: "Alamat kantor", value: cd.address },
      ]
    : [];

  return (
    <Sheet open={!!job} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="gap-0">
        {job ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SourceBadge source={job.source} />
                <span className="text-muted-foreground max-w-[16rem] truncate text-xs">
                  {job.sourceUrl}
                </span>
              </div>
              <SheetTitle className="line-clamp-2">{job.title}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <Section title="Detail Lowongan">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {jobCoreRows.map((r) => (
                    <Row key={r.label} label={r.label} value={r.value} />
                  ))}
                </dl>
              </Section>

              <Section title="AI Match">
                {job.matchScore != null ? (
                  <MatchScoreBlock
                    score={job.matchScore}
                    matchedSkills={job.matchedSkills}
                    missingSkills={job.missingSkills}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Lowongan ini belum memiliki hasil AI match.
                  </p>
                )}
                <MatchDialog
                  jobId={job.id}
                  forceRefresh={job.matchScore != null}
                  trigger={
                    <Button variant="outline" size="sm" className="mt-3 min-h-11">
                      <SparklesIcon className="size-4" />
                      {job.matchScore == null ? "Cek AI match" : "Cek ulang AI match"}
                    </Button>
                  }
                />
              </Section>

              {job.skills && job.skills.length > 0 && (
                <Section title="Keahlian yang Dibutuhkan">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <span
                        key={s}
                        className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Deskripsi Lowongan">
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {job.description || "—"}
                </p>
              </Section>

              {cd && companyRows.some((r) => r.value) && (
                <Section title="Detail Perusahaan">
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
                    <p className="text-muted-foreground mt-3 text-sm whitespace-pre-wrap">
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
  );
}
