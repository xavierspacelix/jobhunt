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
import { ThemeToggle } from "@/components/theme-toggle"
import { KanbanBoard } from "@/components/kanban-board"
import type { AppStatus } from "@/lib/kanban"
import { ListChecksIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await auth()
  const email = session?.user?.email ?? undefined
  const applications = email
    ? await prisma.application.findMany({
        where: { user: { email } },
        include: { job: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      })
    : []

  const initialApplications = applications.map((a) => ({
    id: a.id,
    status: a.status as AppStatus,
    notes: a.notes,
    appliedAt: a.appliedAt?.toISOString() ?? null,
    nextFollowUpAt: a.nextFollowUpAt?.toISOString() ?? null,
    coverLetter: a.coverLetter,
    createdAt: a.createdAt.toISOString(),
    job: {
      id: a.job.id,
      title: a.job.title,
      company: a.job.company,
      location: a.job.location,
      salary: a.job.salary,
      source: a.job.source,
      sourceUrl: a.job.sourceUrl,
    },
  }))

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
                  <BreadcrumbPage>Pelacak Lamaran</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 pr-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <section className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <ListChecksIcon className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Pelacak Lamaran
                </h1>
                <p className="text-sm text-muted-foreground">
                  Tarik kartu antar kolom untuk mengubah status lamaran.
                </p>
              </div>
            </div>
          </section>

          {initialApplications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
              <ListChecksIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada lamaran. Buka{" "}
                <Link href="/jobs" className="text-indigo-600 hover:underline">
                  Lowongan
                </Link>{" "}
                lalu tandai &quot;Tambah ke tracker&quot;.
              </p>
            </div>
          ) : (
            <KanbanBoard initialApplications={initialApplications} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
