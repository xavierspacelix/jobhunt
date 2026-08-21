import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
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
import { Button } from "@/components/ui/button"
import {
  FileTextIcon,
  UploadCloudIcon,
  SparklesIcon,
  BriefcaseIcon,
  TargetIcon,
  CheckCircle2Icon,
  CircleIcon,
  ArrowRightIcon,
} from "lucide-react"

type ExperienceEntry = {
  role?: string
  company?: string
  period?: string
}

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
    (checks.filter(Boolean).length / checks.length) * 100
  )

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const steps = [
    {
      title: "Unggah CV",
      description: "Ekstrak skill, ringkasan, dan pengalaman otomatis.",
      done: hasCV,
      href: "/profile",
    },
    {
      title: "Lengkapi ringkasan",
      description: "Pastikan ringkasan profil mencerminkan profilmu.",
      done: Boolean(summary),
      href: "/profile",
    },
    {
      title: "Tambah skill",
      description: "Semakin lengkap, rekomendasi makin akurat.",
      done: skillsCount > 0,
      href: "/profile",
    },
    {
      title: "Catat pengalaman",
      description: "Tambahkan riwayat pekerjaan terdeteksi.",
      done: experienceCount > 0,
      href: "/profile",
    },
    {
      title: "Cari lowongan",
      description: "Rekomendasi lowongan Glints & Jobstreet.",
      done: false,
      href: "#",
      soon: true,
    },
  ]

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
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <section className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{today}</p>
                <h1 className="mt-1 text-2xl font-semibold text-foreground">
                  Halo, {firstName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ringkasan persiapan lamaran dan profil kamu.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Kelengkapan Profil</span>
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

          <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<FileTextIcon />}
              label="CV Teranalisis"
              value={hasCV ? "Ya" : "Belum"}
            />
            <StatCard
              icon={<BriefcaseIcon />}
              label="Pengalaman"
              value={String(experienceCount)}
            />
            <StatCard
              icon={<SparklesIcon />}
              label="Keahlian"
              value={String(skillsCount)}
            />
            <StatCard
              icon={<TargetIcon />}
              label="Kelengkapan"
              value={`${completeness}%`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <h2 className="text-sm font-medium text-foreground">
                Langkah Selanjutnya
              </h2>
              <ul className="mt-4 space-y-3">
                {steps.map((step) => (
                  <li
                    key={step.title}
                    className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
                  >
                    {step.done ? (
                      <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-accent" />
                    ) : (
                      <CircleIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {step.title}
                        </p>
                        {step.soon && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            Segera
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {!step.soon && (
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={step.href} />}
                        className="shrink-0"
                      >
                        {step.done ? "Lihat" : "Mulai"}
                        <ArrowRightIcon />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground">
                Ringkasan CV
              </h2>
              {summary ? (
                <p className="mt-3 text-sm text-muted-foreground">{summary}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Belum ada ringkasan. Unggah CV untuk membuatnya.
                </p>
              )}
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

          {skills.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground">
                Keahlian ({skills.length})
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {experiences.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground">Pengalaman</h2>
              <ul className="mt-4 space-y-4">
                {experiences.map((exp, i) => (
                  <li
                    key={i}
                    className="relative border-l-2 border-accent/40 pl-4"
                  >
                    <p className="font-medium text-foreground">
                      {exp.role ?? exp.company ?? "Pengalaman"}
                    </p>
                    {exp.company && exp.role && (
                      <p className="text-sm text-muted-foreground">
                        {exp.company}
                      </p>
                    )}
                    {exp.period && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {exp.period}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
