import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { JobFetcher } from "@/components/job-fetcher";
import { BriefcaseIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;
  const profile = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { profile: { select: { skills: true } } },
      })
    : null;
  const defaultKeywords = profile?.profile?.skills ?? [];

  return (
    <AuthenticatedShell pageLabel="Lowongan" userEmail={email}>
      <section className="border-border bg-card rounded-xl border p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              Lowongan
            </h1>
            <p className="text-muted-foreground text-sm">
              Tempel URL Glints atau Jobstreet untuk mengambil detail lowongan,
              lalu simpan ke daftarmu.
            </p>
          </div>
          <BriefcaseIcon className="text-accent size-10" aria-hidden="true" />
        </div>
      </section>
      <JobFetcher defaultKeywords={defaultKeywords} />
    </AuthenticatedShell>
  );
}
