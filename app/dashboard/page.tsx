import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "./actions";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/profile"
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground hover:opacity-90"
          >
            Profil &amp; CV
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground hover:opacity-90"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <h1 className="mt-10 text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-4 text-muted-foreground">
        Login sebagai <span className="text-foreground">{session.user.email}</span>
      </p>
    </main>
  );
}
