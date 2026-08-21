import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  UploadCloud,
  Search,
  Sparkles,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const email = session.user.email ?? "";

  const user = await prisma.user.findUnique({ where: { email } });
  const userId = user?.id;
  const [profile, applications] = userId
    ? await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.application.count({ where: { userId } }),
      ])
    : [null, 0];

  const displayName = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <DashboardShell userEmail={email}>
      <div className="p-6 lg:p-10">
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          Halo, {displayName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ringkasan persiapan lamaranmu di satu tempat.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="size-4" />
              <span className="text-sm">Status CV</span>
            </div>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {profile ? "Terkumpul" : "Belum diunggah"}
            </p>
            {!profile && (
              <Link
                href="/profile"
                className="mt-1 inline-block text-sm text-accent hover:underline"
              >
                Unggah sekarang
              </Link>
            )}
            {profile && (
              <span className="mt-1 inline-flex items-center gap-1 text-sm text-accent">
                <CheckCircle2 className="size-4" /> Terdeteksi
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-4" />
              <span className="text-sm">Skill terdeteksi</span>
            </div>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {profile?.skills.length ?? 0}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">dari CV kamu</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="size-4" />
              <span className="text-sm">Lamaran terkirim</span>
            </div>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {applications}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">belum ada</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Aksi cepat
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              <UploadCloud className="size-4" />
              Unggah / Perbarui CV
            </Link>
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
              <Search className="size-4" />
              Cari Lowongan
              <span className="text-[10px] uppercase tracking-wide">soon</span>
            </span>
          </div>
        </div>

        {profile && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Ringkasan CV
              </h2>
              <Link
                href="/profile"
                className="text-sm text-accent hover:underline"
              >
                Lihat detail
              </Link>
            </div>
            <p className="mt-3 text-foreground">
              {profile.summary || "Belum ada ringkasan."}
            </p>
            {profile.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
