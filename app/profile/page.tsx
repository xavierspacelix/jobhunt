"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import {
  ArrowLeft,
  FileText,
  Loader2,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

type ExperienceEntry = {
  role?: string;
  company?: string;
  period?: string;
};

type Profile = {
  id: string;
  userId: string;
  rawText: string | null;
  skills: string[];
  summary: string | null;
  experience: ExperienceEntry[] | null;
  cvKey: string | null;
  createdAt: string;
  updatedAt: string;
};

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
      {children}
    </span>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!active || !res.ok) return;
        const data = (await res.json()) as {
          profile: Profile | null;
          cvUrl: string | null;
        };
        setProfile(data.profile);
        setCvUrl(data.cvUrl);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSuccess(false);

      if (file.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File too large (max 5MB)");
        return;
      }

      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/cv/upload", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          profile?: Profile;
          error?: string;
        };
        if (!res.ok || !data.profile) {
          setError(data.error ?? "Upload failed");
          return;
        }
        setProfile(data.profile);
        setCvUrl(null);
        if (data.profile.cvKey) {
          const urlRes = await fetch("/api/profile");
          if (urlRes.ok) {
            const urlData = (await urlRes.json()) as { cvUrl: string | null };
            setCvUrl(urlData.cvUrl);
          }
        }
        setSuccess(true);
      } catch {
        setError("Something went wrong while uploading");
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <BrandLogo />
        <ThemeToggle />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Profil &amp; CV
        </h1>
      </div>

      <p className="mt-2 text-muted-foreground">
        Unggah CV (PDF) untuk mengekstrak skill, ringkasan, dan pengalaman
        secara otomatis.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border bg-card hover:border-accent/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        ) : (
          <UploadCloud className="h-8 w-8 text-accent" />
        )}
        <p className="mt-3 font-medium text-foreground">
          {uploading ? "Memproses CV…" : "Tarik PDF ke sini atau klik untuk pilih"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Maksimal 5MB, PDF saja</p>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          CV berhasil diproses.
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat profil…
        </div>
      ) : profile ? (
        <div className="mt-8 space-y-6">
          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              <FileText className="h-4 w-4" /> Lihat CV asli
            </a>
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ringkasan
            </h2>
            <p className="mt-2 text-foreground">
              {profile.summary || "Belum ada ringkasan."}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Skill ({profile.skills.length})
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.skills.length > 0 ? (
                profile.skills.map((skill) => <Chip key={skill}>{skill}</Chip>)
              ) : (
                <span className="text-muted-foreground">Belum terdeteksi.</span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pengalaman
            </h2>
            <ul className="mt-3 space-y-2">
              {profile.experience && profile.experience.length > 0 ? (
                profile.experience.map((exp, i) => (
                  <li key={i} className="text-foreground">
                    {exp.role && <span className="font-medium">{exp.role}</span>}
                    {exp.role && exp.company && (
                      <span className="text-muted-foreground"> di </span>
                    )}
                    {exp.company && (
                      <span className="font-medium">{exp.company}</span>
                    )}
                    {exp.period && (
                      <span className="block text-sm text-muted-foreground">
                        {exp.period}
                      </span>
                    )}
                    {!exp.role && !exp.company && (
                      <span>{exp.period}</span>
                    )}
                  </li>
                ))
              ) : (
                <span className="text-muted-foreground">Belum terdeteksi.</span>
              )}
            </ul>
          </section>
        </div>
      ) : (
        !error && (
          <p className="mt-8 text-muted-foreground">
            Belum ada CV. Unggah PDF di atas untuk memulai.
          </p>
        )
      )}
    </main>
  );
}
