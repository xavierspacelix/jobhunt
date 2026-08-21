import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold text-foreground">JobHunter</h1>
      <p className="text-muted-foreground">
        Tracker lowongan & persiapan lamaran, dengan bantuan AI.
      </p>

      {session?.user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Login sebagai {session.user.email}
          </p>
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Ke Dashboard
          </Link>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm text-card-foreground hover:opacity-90"
          >
            Register
          </Link>
        </div>
      )}
    </main>
  );
}
