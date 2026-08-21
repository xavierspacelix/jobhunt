"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "./actions";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-card-foreground">Login</h1>

        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className={inputClass}
        />

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Sign in
        </button>

        <p className="text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="text-primary underline">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
