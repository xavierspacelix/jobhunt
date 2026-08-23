import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { StatCard } from "@/components/stat-card";
import { StatusDistribution } from "@/components/status-distribution";
import {
  ReminderList,
  type AnalyticsApplication,
} from "@/components/reminder-list";
import type { AppStatus } from "@/lib/kanban";
import { ExtensionDownloadButton } from "@/components/extension-download-button";
import { ExtensionConnectionCard } from "@/components/extension-connection-card";
import { Button } from "@/components/ui/button";
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon,
  SendIcon,
  TrophyIcon,
  UploadCloudIcon,
  UsersIcon,
} from "lucide-react";

type ExperienceEntry = {
  role?: string;
  company?: string;
  period?: string;
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      })
    : null;
  const profile = user?.profile ?? null;

  const firstName = user?.name ?? email?.split("@")[0] ?? "Pengguna";
  const hasCV = Boolean(profile?.cvKey);
  const experiences: ExperienceEntry[] = Array.isArray(profile?.experience)
    ? (profile?.experience as ExperienceEntry[])
    : [];
  const experienceCount = experiences.length;
  const skills = profile?.skills ?? [];
  const skillsCount = skills.length;
  const summary = profile?.summary ?? null;

  const checks = [
    hasCV,
    Boolean(summary),
    skillsCount > 0,
    experienceCount > 0,
  ];
  const completeness = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );

  const applications = email
    ? await prisma.application.findMany({
        where: { user: { email } },
        select: {
          id: true,
          status: true,
          nextFollowUpAt: true,
          job: {
            select: { title: true, company: true, sourceUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const analyticsApplications: AnalyticsApplication[] = applications.map(
    (a) => ({
      id: a.id,
      status: a.status as AppStatus,
      nextFollowUpAt: a.nextFollowUpAt?.toISOString() ?? null,
      job: {
        title: a.job.title,
        company: a.job.company,
        sourceUrl: a.job.sourceUrl,
      },
    }),
  );

  const total = applications.length;
  const applied = analyticsApplications.filter((a) =>
    ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"].includes(a.status),
  ).length;
  const interviews = analyticsApplications.filter(
    (a) => a.status === "INTERVIEW",
  ).length;
  const offers = analyticsApplications.filter(
    (a) => a.status === "OFFER",
  ).length;
  const interviewRate =
    applied > 0 ? Math.round((interviews / applied) * 100) : 0;

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AuthenticatedShell
      pageLabel="Dashboard"
      userEmail={email}
      headerActions={<ExtensionDownloadButton />}
    >
      {/* Hero */}
      <section className="border-border bg-card rounded-2xl border p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{today}</p>
            <h1 className="text-foreground mt-1 text-2xl font-semibold">
              Halo, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Ini ringkasan persiapan dan progres lamaran kamu.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Kelengkapan Profil</span>
              <span className="text-foreground font-medium">
                {completeness}%
              </span>
            </div>
            <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* KPI row */}
      <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BriefcaseIcon />}
          label="Total Lamaran"
          value={String(total)}
        />
        <StatCard
          icon={<SendIcon />}
          label="Terkirim"
          value={String(applied)}
        />
        <StatCard
          icon={<UsersIcon />}
          label="Wawancara"
          value={String(interviews)}
          hint={applied > 0 ? `${interviewRate}% dari terkirim` : undefined}
        />
        <StatCard
          icon={<TrophyIcon />}
          label="Penawaran"
          value={String(offers)}
        />
      </div>

      {/* Bento: analytics + profile */}
      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 md:gap-8 lg:col-span-2">
          <StatusDistribution applications={analyticsApplications} />
          <ReminderList applications={analyticsApplications} />
        </div>

        <div className="flex flex-col gap-6 md:gap-8">
          <ExtensionConnectionCard />
          <section className="border-border bg-card flex flex-col rounded-2xl border p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="bg-accent/10 text-accent flex size-8 items-center justify-center rounded-xl">
                <FileTextIcon className="size-4" />
              </span>
              <h2 className="text-foreground text-sm font-medium">
                Profil &amp; CV
              </h2>
            </div>

            <div className="mt-4 space-y-2.5">
              <ProfileRow
                done={hasCV}
                label="CV teranalisis"
                value={hasCV ? "Ya" : "Belum"}
              />
              <ProfileRow
                done={skillsCount > 0}
                label="Keahlian terdeteksi"
                value={String(skillsCount)}
              />
              <ProfileRow
                done={experienceCount > 0}
                label="Pengalaman tercatat"
                value={String(experienceCount)}
              />
            </div>

            {summary ? (
              <p className="text-muted-foreground mt-4 line-clamp-3 text-sm">
                {summary}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              <Button variant="cta" render={<Link href="/profile" />}>
                <UploadCloudIcon />
                Perbarui CV
              </Button>
              <Button variant="outline" render={<Link href="/profile" />}>
                <FileTextIcon />
                Kelola Profil
              </Button>
            </div>
          </section>
        </div>
      </div>
    </AuthenticatedShell>
  );
}

function ProfileRow({
  done,
  label,
  value,
}: {
  done: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-2">
        {done ? (
          <CheckCircle2Icon className="text-accent size-4" />
        ) : (
          <CircleIcon className="text-muted-foreground size-4" />
        )}
        {label}
      </span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
