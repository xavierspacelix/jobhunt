import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { StatCard } from "@/components/stat-card"
import { StatusDistribution } from "@/components/status-distribution"
import {
  ReminderList,
  type AnalyticsApplication,
} from "@/components/reminder-list"
import type { AppStatus } from "@/lib/kanban"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon,
  SendIcon,
  TrophyIcon,
  UploadCloudIcon,
  UsersIcon,
} from "lucide-react"

type ExperienceEntry = {
  role?: string
  company?: string
  period?: string
}

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth()
  const email = session?.user?.email ?? undefined
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      })
    : null
  const profile = user?.profile ?? null

  const firstName = user?.name ?? email?.split("@")[0] ?? "Pengguna"
  const hasCV = Boolean(profile?.cvKey)
  const experiences: ExperienceEntry[] = Array.isArray(profile?.experience)
    ? (profile?.experience as ExperienceEntry[])
    : []
  const experienceCount = experiences.length
  const skills = profile?.skills ?? []
  const skillsCount = skills.length
  const summary = profile?.summary ?? null

  const checks = [hasCV, Boolean(summary), skillsCount > 0, experienceCount > 0]
  const completeness = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  )

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
    : []

  const analyticsApplications: AnalyticsApplication[] = applications.map((a) => ({
    id: a.id,
    status: a.status as AppStatus,
    nextFollowUpAt: a.nextFollowUpAt?.toISOString() ?? null,
    job: {
      title: a.job.title,
      company: a.job.company,
      sourceUrl: a.job.sourceUrl,
    },
  }))

  const total = applications.length
  const applied = analyticsApplications.filter((a) =>
    ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"].includes(a.status),
  ).length
  const interviews = analyticsApplications.filter(
    (a) => a.status === "INTERVIEW",
  ).length
  const offers = analyticsApplications.filter((a) => a.status === "OFFER").length
  const interviewRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <SidebarProvider>
      <AppSidebar userEmail={email} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">JobHunter</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 pr-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 md:gap-8 md:p-8">
          {/* Hero */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{today}</p>
                <h1 className="mt-1 text-2xl font-semibold text-foreground">
                  Halo, {firstName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ini ringkasan persiapan dan progres lamaran kamu.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Kelengkapan Profil
                  </span>
                  <span className="font-medium text-foreground">
                    {completeness}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
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

            <section className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <FileTextIcon className="size-4" />
                </span>
                <h2 className="text-sm font-medium text-foreground">
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
                <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
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
      </SidebarInset>
    </SidebarProvider>
  )
}

function ProfileRow({
  done,
  label,
  value,
}: {
  done: boolean
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {done ? (
          <CheckCircle2Icon className="size-4 text-accent" />
        ) : (
          <CircleIcon className="size-4 text-muted-foreground" />
        )}
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
