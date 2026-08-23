import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { KanbanBoard } from "@/components/kanban-board";
import type { AppStatus } from "@/lib/kanban";
import { ListChecksIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;
  const applications = email
    ? await prisma.application.findMany({
        where: { user: { email } },
        include: { job: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      })
    : [];

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
  }));

  return (
    <AuthenticatedShell pageLabel="Pelacak Lamaran" userEmail={email}>
      <section className="border-border bg-card rounded-xl border p-5 md:p-6">
        <div className="flex items-center gap-3">
          <span className="bg-accent/10 text-accent flex size-9 items-center justify-center rounded-lg">
            <ListChecksIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-foreground text-xl font-semibold">
              Pelacak Lamaran
            </h1>
            <p className="text-muted-foreground text-sm">
              Tarik kartu antar kolom untuk mengubah status lamaran.
            </p>
          </div>
        </div>
      </section>

      {initialApplications.length === 0 ? (
        <div className="border-border bg-card/50 flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
          <ListChecksIcon
            className="text-muted-foreground size-8"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-sm">
            Belum ada lamaran. Buka{" "}
            <Link
              href="/jobs"
              className="text-accent font-medium hover:underline"
            >
              Lowongan
            </Link>{" "}
            lalu tandai &quot;Tambah ke tracker&quot;.
          </p>
        </div>
      ) : (
        <KanbanBoard initialApplications={initialApplications} />
      )}
    </AuthenticatedShell>
  );
}
