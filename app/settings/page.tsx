import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { AiSettingsForm, type AiSettingsInitial } from "@/components/ai-settings-form";

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;

  let initial: AiSettingsInitial = {
    hasLlmApiKey: false,
    llmBaseUrl: "",
    llmModel: "",
  };
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        profile: {
          select: { llmApiKey: true, llmBaseUrl: true, llmModel: true },
        },
      },
    });
    if (user?.profile) {
      initial = {
        hasLlmApiKey: Boolean(user.profile.llmApiKey),
        llmBaseUrl: user.profile.llmBaseUrl ?? "",
        llmModel: user.profile.llmModel ?? "",
      };
    }
  }

  return (
    <AuthenticatedShell pageLabel="Pengaturan" userEmail={email}>
      <div className="flex flex-col gap-4">
        <section className="border-border bg-card rounded-xl border p-5 md:p-6">
          <h1 className="text-foreground text-2xl font-semibold">Pengaturan</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kelola konfigurasi akun Anda.
          </p>
        </section>
        <section className="border-border bg-card rounded-xl border p-5 md:p-6">
          <h2 className="text-foreground text-sm font-medium">
            Pengaturan AI Match
          </h2>
          <div className="mt-3">
            <AiSettingsForm initial={initial} />
          </div>
        </section>
      </div>
    </AuthenticatedShell>
  );
}
