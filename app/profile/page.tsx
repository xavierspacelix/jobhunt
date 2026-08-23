import { auth } from "@/lib/auth";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { ProfileManager } from "@/components/profile-manager";

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? undefined;

  return (
    <AuthenticatedShell pageLabel="Profil & CV" userEmail={email}>
      <ProfileManager />
    </AuthenticatedShell>
  );
}
