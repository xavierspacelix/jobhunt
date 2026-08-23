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
  CheckCircle2Icon,
  XCircleIcon,
  CircleIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchRunHasFailed,
  searchRunHasWarnings,
  type SearchEvent,
} from "@/lib/job-search";
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

const LOCATION_CHIPS: { label: string; value: string }[] = [
  { label: "Semua Indonesia", value: "" },
  { label: "Jakarta", value: "Jakarta" },
  { label: "Bandung", value: "Bandung" },
  { label: "Surabaya", value: "Surabaya" },
  { label: "Tangerang", value: "Tangerang" },
  { label: "Remote", value: "Remote" },
];

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
  origin?: "auto" | "manual" | "both";
  tracked?: boolean;
}

interface ScrapeJobPayload {
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  source: Source;
  sourceUrl: string;
  description: string | null;
  postedAt: string | null;
  employmentType: string | null;
  experience: string | null;
  education: string | null;
  category: string | null;
  recruiter: string | null;
  skills: string[];
  externalJobId: string | null;
  shareToken: string | null;
  companyRefId: string | null;
  companyDetails: CompanyDetails | null;
  previewToken: string;
}

interface ScrapeResult {
  job: ScrapeJobPayload;
  match: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    source: "ai";
    profileRevision: string;
  };
}

type SearchDoneEvent = Extract<SearchEvent, { type: "done" }>;

function SourceBadge({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        source === "GLINTS"
          ? "bg-accent/10 text-accent"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {source === "GLINTS" ? "Glints" : "Jobstreet"}
    </span>
  );
}

function OriginPill({ origin }: { origin?: "auto" | "manual" | "both" }) {
  if (!origin) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        origin === "auto" || origin === "both"
          ? "bg-accent/10 text-accent"
          : "bg-secondary text-secondary-foreground",
      )}
    >
      {origin === "both"
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

export function JobFetcher({
  defaultKeywords,
}: {
  defaultKeywords?: string[];
}) {
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
  const [tab, setTab] = React.useState<"saved" | "manual" | "scrape">("saved");
  const [searchInput, setSearchInput] = React.useState(
    defaultKeywords?.join(", ") ?? "",
  );
  const [location, setLocation] = React.useState("");
  const [recommending, setRecommending] = React.useState(false);
  const [recommendError, setRecommendError] = React.useState<string | null>(
    null,
  );
  const [recommendSummary, setRecommendSummary] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchLog, setSearchLog] = React.useState<
    {
      id: number;
      message: string;
      kind: "info" | "ok" | "error" | "warning" | "step";
    }[]
  >([]);
  const [scrapeResults, setScrapeResults] = React.useState<ScrapeResult[]>([]);
  const [scrapeSaveError, setScrapeSaveError] = React.useState<string | null>(
    null,
  );
  const [savingKey, setSavingKey] = React.useState<string | null>(null);
  const [savedKeys, setSavedKeys] = React.useState<string[]>([]);
  const [jobsLoading, setJobsLoading] = React.useState(true);
  const [jobsError, setJobsError] = React.useState<string | null>(null);
  const [searchAnnouncement, setSearchAnnouncement] = React.useState("");
  const [searchCompleted, setSearchCompleted] = React.useState(false);
  const [searchOutcome, setSearchOutcome] =
    React.useState<SearchDoneEvent | null>(null);
  const handoffConsumed = React.useRef(false);

  const loadJobs = React.useCallback(async () => {
    setJobsError(null);
    try {
      const jobsRes = await fetch("/api/jobs");
      if (!jobsRes.ok) throw new Error("load failed");
      const jobsData = await jobsRes.json();
      const loadedJobs = (jobsData.jobs ?? []) as SavedJob[];
      setJobs(loadedJobs);
      setTrackedIds(
        loadedJobs.filter((job) => job.tracked).map((job) => job.id),
      );
    } catch {
      setJobsError("Lowongan gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setJobsLoading(false);
    }
  }, []);

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

  async function handleRecommend() {
    if (recommending || searching) return;
    setRecommending(true);
    setRecommendError(null);
    try {
      const res = await fetch("/api/jobs/recommend-keywords", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        const recommendedKeywords = Array.isArray(data.keywords)
          ? data.keywords.join(", ")
          : "";
        if (!recommendedKeywords) {
          setRecommendError(
            "AI tidak menghasilkan peran pencarian yang valid.",
          );
          return;
        }
        const recommendedLocation = location.trim()
          ? location
          : typeof data.location === "string"
            ? data.location
            : "";
        setSearchInput(recommendedKeywords);
        setLocation(recommendedLocation);
        setRecommendSummary(data.summary ?? "");
        setRecommending(false);
        await runSearch(recommendedKeywords, recommendedLocation);
      } else {
        setRecommendError(data.error ?? "Gagal memuat rekomendasi");
      }
    } catch {
      setRecommendError("Terjadi kesalahan saat memuat rekomendasi");
    } finally {
      setRecommending(false);
    }
  }

  async function runSearch(
    keywords = searchInput,
    selectedLocation = location,
  ) {
    if (searching) return;
    setSearching(true);
    setSearchCompleted(false);
    setSearchOutcome(null);
    setSearchLog([]);
    setScrapeResults([]);
    setRecommendError(null);
    setSearchAnnouncement("Menyiapkan pencarian lowongan.");
    let logId = 0;
    const push = (
      message: string,
      kind: "info" | "ok" | "error" | "warning" | "step" = "info",
    ) => {
      setSearchLog((prev) => [...prev, { id: logId++, message, kind }]);
      setSearchAnnouncement(message);
    };
    let terminalReceived = false;

    const applyEvent = (ev: SearchEvent) => {
      switch (ev.type) {
        case "start":
          push("Memulai pencarian…", "step");
          break;
        case "search":
        case "detail":
          push(ev.message, "step");
          break;
        case "links":
          push(ev.message, ev.failed ? "warning" : "info");
          break;
        case "result":
          setScrapeResults((prev) => [
            ...prev,
            { job: ev.job as unknown as ScrapeJobPayload, match: ev.match },
          ]);
          setSearchAnnouncement(
            `Lowongan ${ev.job.title} ditemukan dengan skor kecocokan ${ev.match.score} dari 100.`,
          );
          break;
        case "done":
          terminalReceived = true;
          setSearchLog([
            {
              id: -1,
              message: ev.message,
              kind: searchRunHasFailed(ev)
                ? "error"
                : searchRunHasWarnings(ev)
                  ? "warning"
                  : "ok",
            },
          ]);
          setSearchAnnouncement(ev.message);
          setSearchOutcome(ev);
          setSearchCompleted(true);
          break;
        case "error":
          terminalReceived = true;
          push(ev.message, "error");
          break;
      }
    };

    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keywords,
          location: selectedLocation,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        push(data?.error ?? "Gagal memulai pencarian.", "error");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const text = part.trim();
          if (!text.startsWith("data:")) continue;
          const json = text.slice(5).trim();
          if (!json) continue;
          let ev: SearchEvent;
          try {
            ev = JSON.parse(json) as SearchEvent;
          } catch {
            continue;
          }
          applyEvent(ev);
        }
      }
      if (!terminalReceived) {
        push("Pencarian terputus sebelum selesai. Coba lagi.", "error");
      }
    } catch {
      push("Koneksi terputus saat mencari.", "error");
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveScrape(r: ScrapeResult) {
    const key = r.job.sourceUrl;
    if (savedKeys.includes(key)) return;
    setSavingKey(key);
    setScrapeSaveError(null);
    try {
      const res = await fetch("/api/jobs/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ previewToken: r.job.previewToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeSaveError(data.error ?? "Gagal menyimpan lowongan");
        return;
      }
      setSavedKeys((prev) => [...prev, key]);
      await loadJobs();
    } catch {
      setScrapeSaveError("Terjadi kesalahan saat menyimpan lowongan.");
    } finally {
      setSavingKey(null);
    }
  }

  const displayJobs = jobs;
  const allAiScoringFailed = Boolean(
    searchOutcome &&
    searchOutcome.inspected > 0 &&
    searchOutcome.aiFailures === searchOutcome.inspected,
  );
  const allSearchPagesFailed = Boolean(
    searchOutcome &&
    searchOutcome.searchPages > 0 &&
    searchOutcome.searchFailures === searchOutcome.searchPages,
  );
  const allDetailFetchesFailed = Boolean(
    searchOutcome &&
    searchOutcome.details > 0 &&
    searchOutcome.blocked === searchOutcome.details,
  );
  const allQualifiedResultsInvalid = Boolean(
    searchOutcome &&
    searchOutcome.results === 0 &&
    (searchOutcome.invalid ?? 0) > 0,
  );
  const searchRunFailed =
    allAiScoringFailed ||
    allSearchPagesFailed ||
    allDetailFetchesFailed ||
    allQualifiedResultsInvalid;
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
      <div className="border-border bg-card inline-flex flex-wrap gap-1 rounded-lg border p-1">
        {(
          [
            ["saved", `Lowongan saya (${jobs.length})`],
            ["manual", "Input Manual (Link)"],
            ["scrape", "Cari (Scrape)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
        <section className="border-border bg-card rounded-xl border p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h2 className="text-foreground text-lg font-semibold tracking-tight">
                Cari Lowongan (Scrape)
              </h2>
              <p className="text-muted-foreground text-sm">
                Temukan lowongan terbaik dari seluruh profil CV Anda. AI menilai
                maksimal 30 lowongan dan hanya menampilkan skor minimal 70.
              </p>
            </div>
            <SparklesIcon className="text-accent size-10" />
          </div>

          <Button
            variant="cta"
            className="mt-4"
            onClick={handleRecommend}
            disabled={recommending || searching}
          >
            {recommending || searching ? (
              <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            {recommending
              ? "Menganalisis CV…"
              : searching
                ? "Mencari dan menilai…"
                : "Cari Rekomendasi Terbaik dari CV"}
          </Button>
          <p className="text-muted-foreground mt-2 text-xs">
            AI only · skor minimal 70/100 · maksimal 30 lowongan · tidak
            tersimpan otomatis
          </p>
          {recommendError && (
            <p className="text-destructive mt-2 text-sm" role="alert">
              {recommendError}
            </p>
          )}
          {recommendSummary && (
            <p className="bg-secondary text-secondary-foreground mt-3 rounded-md px-3 py-2 text-sm">
              {recommendSummary}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <label
              htmlFor="job-keywords"
              className="text-foreground text-sm font-medium"
            >
              Kata kunci lowongan
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="job-keywords"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="mis. React, Node.js (skill/kata kunci)"
                className="flex-1"
                disabled={searching}
              />
              <Button
                onClick={() => void runSearch()}
                disabled={searching || !searchInput.trim()}
              >
                {searching ? (
                  <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <SearchIcon className="size-4" />
                )}
                {searching ? "Mencari…" : "Cari"}
              </Button>
            </div>
          </div>

          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {searchAnnouncement}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <label
              htmlFor="job-location"
              className="text-foreground text-sm font-medium"
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
                const active = location === chip.value;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setLocation(chip.value)}
                    aria-pressed={active}
                    disabled={searching}
                    className={cn(
                      "min-h-11 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                      active
                        ? "border-border bg-secondary text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              Hanya menampilkan lowongan ≤30 hari &amp; masih dibuka.
            </p>
          </div>

          {searchLog.length > 0 && (
            <div className="mt-4">
              <span className="text-foreground text-sm font-medium">
                Proses
              </span>
              <ul className="mt-2 space-y-1.5">
                {searchLog.map((l) => (
                  <li key={l.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0">
                      {l.kind === "ok" ? (
                        <CheckCircle2Icon className="text-accent size-4" />
                      ) : l.kind === "error" ? (
                        <XCircleIcon className="text-destructive size-4" />
                      ) : l.kind === "warning" ? (
                        <TriangleAlertIcon
                          className="size-4"
                          style={{ color: "var(--color-warning)" }}
                        />
                      ) : searching ? (
                        <Loader2Icon className="text-muted-foreground size-4 animate-spin motion-reduce:animate-none" />
                      ) : (
                        <CircleIcon className="text-muted-foreground size-4" />
                      )}
                    </span>
                    <span
                      className={
                        l.kind === "error"
                          ? "text-destructive"
                          : l.kind === "warning"
                            ? "text-foreground"
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

          {searchCompleted && scrapeResults.length === 0 && (
            <div
              className="border-border bg-background/40 mt-5 rounded-xl border border-dashed p-6 text-center"
              role={searchRunFailed ? "alert" : "status"}
            >
              {searchRunFailed ? (
                <XCircleIcon className="text-destructive mx-auto size-8" />
              ) : (
                <SearchIcon className="text-muted-foreground mx-auto size-8" />
              )}
              <p className="text-foreground mt-3 text-sm font-medium">
                {allAiScoringFailed
                  ? "AI gagal menilai semua lowongan"
                  : allSearchPagesFailed
                    ? "Portal lowongan tidak dapat dijangkau"
                    : allDetailFetchesFailed
                      ? "Detail lowongan tidak dapat diambil"
                      : allQualifiedResultsInvalid
                        ? "Hasil rekomendasi tidak valid"
                        : "Belum ada lowongan dengan skor minimal 70"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {searchRunFailed
                  ? "Coba lagi setelah beberapa saat. Tidak ada skor heuristik yang digunakan."
                  : "Ubah lokasi atau peran pencarian, lalu coba lagi."}
              </p>
            </div>
          )}

          {scrapeResults.length > 0 && (
            <div className="mt-5">
              {scrapeSaveError ? (
                <p className="text-destructive mb-3 text-sm" role="alert">
                  {scrapeSaveError}
                </p>
              ) : null}
              <span className="text-foreground text-sm font-medium">
                Rekomendasi Terbaik ({scrapeResults.length})
              </span>
              <ul className="mt-2 flex flex-col gap-3">
                {scrapeResults.map((r, index) => {
                  const saved = savedKeys.includes(r.job.sourceUrl);
                  const key = r.job.sourceUrl;
                  return (
                    <li
                      key={key}
                      className="border-border bg-card rounded-xl border p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-xs tabular-nums">
                              #{index + 1}
                            </span>
                            <span className="text-foreground font-medium">
                              {r.job.title}
                            </span>
                            <SourceBadge source={r.job.source} />
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {[r.job.company, r.job.location]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                            {r.job.salary ? ` · ${r.job.salary}` : ""}
                          </p>
                          <MatchScoreBlock
                            score={r.match.score}
                            matchedSkills={r.match.matchedSkills}
                            missingSkills={r.match.missingSkills}
                          />
                          {r.job.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {r.job.skills.slice(0, 8).map((s) => (
                                <span
                                  key={s}
                                  className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs"
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
                            className="text-accent inline-flex min-h-11 items-center gap-1 text-sm hover:underline"
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
                              <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" />
                            ) : (
                              <SaveIcon className="size-3.5" />
                            )}
                            {saved
                              ? "Tersimpan"
                              : savingKey === key
                                ? "Menyimpan…"
                                : "Simpan"}
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

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
          {jobsLoading && displayJobs.length === 0 ? (
            <ul className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <JobSkeleton key={i} />
              ))}
            </ul>
          ) : displayJobs.length === 0 ? (
            <div className="border-border bg-card/50 flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
              <BriefcaseIcon className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">
                Belum ada lowongan tersimpan atau dilacak.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {displayJobs.map((job) => (
                <li
                  key={job.id}
                  className="border-border bg-card rounded-xl border p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">
                          {job.title}
                        </span>
                        <SourceBadge source={job.source} />
                        <OriginPill origin={job.origin} />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {[job.company, job.location]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {job.salary ? ` · ${job.salary}` : ""}
                      </p>
                      {job.postedAt && (
                        <p className="text-muted-foreground text-xs">
                          Diposting{" "}
                          {new Date(job.postedAt).toLocaleDateString("id-ID")}
                        </p>
                      )}
                      {job.matchScore != null ? (
                        <MatchScoreBlock
                          score={job.matchScore}
                          matchedSkills={job.matchedSkills}
                          missingSkills={job.missingSkills}
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {trackedIds.includes(job.id) ? (
                        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
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
                            <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <ListChecksIcon className="size-3.5" />
                          )}
                          {addingId === job.id ? "Menambahkan…" : "Tracker"}
                        </Button>
                      )}
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent inline-flex min-h-11 items-center gap-1 text-sm hover:underline"
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
                            className="text-accent hover:text-accent gap-1"
                          >
                            <SparklesIcon className="size-3.5" />
                            Cek
                          </Button>
                        }
                      />
                      {!job.origin ? null : confirmDeleteId === job.id ? (
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
                            className="text-destructive hover:text-destructive"
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
