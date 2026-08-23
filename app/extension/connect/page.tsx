import { auth } from "@/lib/auth";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { ExtensionConnectCard } from "@/components/extension-connect-card";
import { parseExtensionConnectQuery } from "@/components/extension-connect-query";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExtensionConnectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const values = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }

  const parsed = parseExtensionConnectQuery(params);

  return (
    <AuthenticatedShell
      pageLabel="Hubungkan Extension"
      userEmail={session?.user?.email ?? undefined}
    >
      <div className="flex flex-1 items-center py-4 md:py-8">
        <ExtensionConnectCard
          request={parsed.success ? parsed.data : null}
          validationError={parsed.success ? undefined : parsed.error}
        />
      </div>
    </AuthenticatedShell>
  );
}
