"use client";

import * as React from "react";
import {
  BriefcaseIcon,
  ExternalLinkIcon,
  EyeIcon,
  ListChecksIcon,
  Loader2Icon,
  PuzzleIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import { MatchDialog } from "@/components/match-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Source = "GLINTS" | "JOBSTREET";

type CompanyDetails = {
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
};

export type ExtensionJob = {
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
  companyRefId?: string | null;
  companyDetails?: CompanyDetails | null;
  matchScore?: number | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  tracked?: boolean;
};

function SourceBadge({ source }: { source: Source }) {
  return (
    <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      {source === "GLINTS" ? "Glints" : "Jobstreet"}
    </span>
  );
}

function ExtensionBadge() {
  return (
    <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <PuzzleIcon className="size-3" aria-hidden="true" />
      Extension
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--destructive)";
}

function MatchDetails({ job }: { job: ExtensionJob }) {
  if (job.matchScore == null) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-foreground text-sm font-medium">
        Skor kecocokan:{" "}
        <span
          className="rounded-full border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums"
          style={{
            color: scoreColor(job.matchScore),
            borderColor: scoreColor(job.matchScore),
            backgroundColor: `color-mix(in srgb, ${scoreColor(job.matchScore)} 12%, transparent)`,
          }}
        >
          {job.matchScore}/100
        </span>
      </p>
      {job.matchedSkills?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-foreground text-xs font-medium">Cocok:</span>
          {job.matchedSkills.map((skill) => (
            <span
              key={`matched-${skill}`}
              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      {job.missingSkills?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-foreground text-xs font-medium">Kurang:</span>
          {job.missingSkills.map((skill) => (
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

function JobSkeleton() {
  return (
    <li className="border-border bg-card rounded-xl border p-4">
      <div className="space-y-3">
        <div className="bg-muted h-5 w-2/5 animate-pulse rounded motion-reduce:animate-none" />
        <div className="bg-muted h-4 w-3/5 animate-pulse rounded motion-reduce:animate-none" />
        <div className="bg-muted h-11 w-full animate-pulse rounded-lg motion-reduce:animate-none sm:w-2/5" />
      </div>
    </li>
  );
}

export function ExtensionJobList({
  initialJobs,
}: {
  initialJobs?: ExtensionJob[];
}) {
  const [jobs, setJobs] = React.useState<ExtensionJob[]>(initialJobs ?? []);
  const [loading, setLoading] = React.useState(initialJobs === undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );
  const [detailJob, setDetailJob] = React.useState<ExtensionJob | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  React.useEffect(() => {
    if (initialJobs !== undefined) return;
    let cancelled = false;

    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs?origin=extension");
        const data = (await response.json().catch(() => null)) as {
          jobs?: ExtensionJob[];
        } | null;
        if (!response.ok || !Array.isArray(data?.jobs)) {
          throw new Error("load failed");
        }
        if (!cancelled) setJobs(data.jobs);
      } catch {
        if (!cancelled) {
          setError(
            "Lowongan dari extension gagal dimuat. Periksa koneksi lalu coba lagi.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadJobs();
    return () => {
      cancelled = true;
    };
  }, [initialJobs, reloadKey]);

  function retry() {
    setError(null);
    setLoading(true);
    setReloadKey((value) => value + 1);
  }

  async function addToTracker(job: ExtensionJob) {
    if (job.tracked) return;
    setAddingId(job.id);
    setError(null);
    setAnnouncement("");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Lowongan gagal ditambahkan ke pelacak.");
        return;
      }
      setJobs((current) =>
        current.map((item) =>
          item.id === job.id ? { ...item, tracked: true } : item,
        ),
      );
      setAnnouncement(`${job.title} berhasil ditambahkan ke pelacak lamaran.`);
    } catch {
      setError("Lowongan gagal ditambahkan ke pelacak. Periksa koneksi Anda.");
    } finally {
      setAddingId(null);
    }
  }

  async function unsave(job: ExtensionJob) {
    setDeletingId(job.id);
    setError(null);
    setAnnouncement("");

    try {
      const response = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(
          data?.error ?? "Lowongan gagal dihapus dari daftar tersimpan.",
        );
        return;
      }
      setJobs((current) => current.filter((item) => item.id !== job.id));
      setConfirmDeleteId(null);
      if (detailJob?.id === job.id) setDetailJob(null);
      setAnnouncement(
        `${job.title} dihapus dari lowongan extension tersimpan.`,
      );
    } catch {
      setError("Lowongan gagal dihapus. Periksa koneksi lalu coba lagi.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div aria-busy={loading}>
      {error ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
          role="alert"
        >
          <span>{error}</span>
          {jobs.length === 0 ? (
            <Button variant="outline" size="sm" onClick={retry}>
              Coba lagi
            </Button>
          ) : null}
        </div>
      ) : null}

      {loading && jobs.length === 0 ? (
        <ul
          className="flex flex-col gap-3"
          aria-label="Memuat lowongan extension"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <JobSkeleton key={index} />
          ))}
        </ul>
      ) : jobs.length === 0 ? (
        <section className="border-border bg-card/50 flex flex-col items-center rounded-xl border border-dashed p-8 text-center md:p-10">
          <span className="bg-secondary text-muted-foreground flex size-12 items-center justify-center rounded-xl">
            <BriefcaseIcon className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-foreground mt-4 text-base font-semibold">
            Belum ada lowongan dari extension
          </h2>
          <p className="text-muted-foreground mt-1 max-w-md text-sm leading-6">
            Buka halaman detail lowongan di Glints atau Jobstreet, lalu gunakan
            extension JobHunter untuk menyimpannya ke sini.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="border-border bg-card rounded-xl border p-4 md:p-5"
            >
              <article className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-foreground font-semibold break-words">
                      {job.title}
                    </h2>
                    <SourceBadge source={job.source} />
                    <ExtensionBadge />
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {[job.company, job.location].filter(Boolean).join(" · ") ||
                      "Perusahaan dan lokasi tidak tersedia"}
                  </p>
                  {job.salary ? (
                    <p className="text-foreground mt-1 font-mono text-xs">
                      {job.salary}
                    </p>
                  ) : null}
                  {job.postedAt ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Diposting {formatDate(job.postedAt)}
                    </p>
                  ) : null}
                  <MatchDetails job={job} />
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:max-w-sm lg:justify-end">
                  {job.tracked ? (
                    <span className="text-muted-foreground inline-flex min-h-11 items-center gap-1.5 px-2 text-xs md:min-h-9">
                      <ListChecksIcon className="size-4" aria-hidden="true" />
                      Di pelacak
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={addingId === job.id}
                      onClick={() => addToTracker(job)}
                    >
                      {addingId === job.id ? (
                        <Loader2Icon
                          className="animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : (
                        <ListChecksIcon aria-hidden="true" />
                      )}
                      {addingId === job.id
                        ? "Menambahkan..."
                        : "Tambah ke pelacak"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailJob(job)}
                  >
                    <EyeIcon aria-hidden="true" />
                    Detail
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    render={
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <ExternalLinkIcon aria-hidden="true" />
                    Buka sumber
                  </Button>
                  <MatchDialog
                    jobId={job.id}
                    onComplete={(result) => {
                      const match = {
                        matchScore: result.score,
                        matchedSkills: result.matchedSkills,
                        missingSkills: result.missingSkills,
                      };
                      setJobs((current) =>
                        current.map((item) =>
                          item.id === job.id ? { ...item, ...match } : item,
                        ),
                      );
                      setDetailJob((current) =>
                        current?.id === job.id ? { ...current, ...match } : current,
                      );
                    }}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent hover:text-accent"
                      >
                        <SparklesIcon aria-hidden="true" />
                        Cek kecocokan
                      </Button>
                    }
                  />
                  {confirmDeleteId === job.id ? (
                    <div className="bg-secondary flex flex-wrap items-center gap-2 rounded-lg p-1.5">
                      <span className="text-secondary-foreground px-1 text-xs">
                        Hapus simpanan?
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === job.id}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Batal
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === job.id}
                        onClick={() => unsave(job)}
                      >
                        {deletingId === job.id ? (
                          <Loader2Icon
                            className="animate-spin motion-reduce:animate-none"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2Icon aria-hidden="true" />
                        )}
                        {deletingId === job.id ? "Menghapus..." : "Ya, hapus"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus ${job.title} dari lowongan tersimpan`}
                      onClick={() => setConfirmDeleteId(job.id)}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
      <JobDetailSheet job={detailJob} onClose={() => setDetailJob(null)} />
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "tanggal tidak tersedia";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function DetailRow({
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
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground mt-0.5 text-sm break-words">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent inline-flex min-h-11 items-center hover:underline md:min-h-9"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-foreground mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function JobDetailSheet({
  job,
  onClose,
}: {
  job: ExtensionJob | null;
  onClose: () => void;
}) {
  const details: Array<[string, string | null | undefined]> = job
    ? [
        ["Posisi", job.title],
        ["Perusahaan", job.company],
        ["Gaji", job.salary],
        ["Tipe pekerjaan", job.employmentType],
        ["Pengalaman", job.experience],
        ["Pendidikan", job.education],
        ["Lokasi", job.location],
        ["Kategori", job.category],
        ["Perekrut", job.recruiter],
        ["Referensi portal", job.externalJobId],
        ["ID perusahaan", job.companyRefId],
      ]
    : [];
  const company = job?.companyDetails;
  const companyLinks: Array<[string, string | null | undefined]> = company
    ? [
        ["Situs web", company.website],
        ["LinkedIn", company.linkedin],
        ["Instagram", company.instagram],
        ["Twitter", company.twitter],
        ["Facebook", company.facebook],
      ]
    : [];

  return (
    <Sheet open={job !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0">
        {job ? (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={job.source} />
                <ExtensionBadge />
              </div>
              <SheetTitle className="pr-8">{job.title}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <DetailSection title="Detail Lowongan">
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {details.map(([label, value]) => (
                    <DetailRow key={label} label={label} value={value} />
                  ))}
                </dl>
              </DetailSection>

              <MatchDetails job={job} />

              {job.skills?.length ? (
                <DetailSection title="Keahlian yang Dibutuhkan">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </DetailSection>
              ) : null}

              <DetailSection title="Deskripsi Lowongan">
                <p className="text-muted-foreground text-sm leading-6 whitespace-pre-wrap">
                  {job.description || "Deskripsi tidak tersedia."}
                </p>
              </DetailSection>

              {company ? (
                <DetailSection title="Detail Perusahaan">
                  <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <DetailRow label="Nama" value={company.name} />
                    <DetailRow label="Industri" value={company.industry} />
                    <DetailRow label="Ukuran" value={company.size} />
                    <DetailRow label="Alamat" value={company.address} />
                    {companyLinks.map(([label, value]) => (
                      <DetailRow
                        key={label}
                        label={label}
                        value={value}
                        href={value}
                      />
                    ))}
                  </dl>
                  {company.about ? (
                    <p className="text-muted-foreground mt-4 text-sm leading-6 whitespace-pre-wrap">
                      {company.about}
                    </p>
                  ) : null}
                </DetailSection>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
