"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "./actions";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-card-foreground">Register</h1>

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
          minLength={8}
          placeholder="Password (min 8 karakter)"
          className={inputClass}
        />

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Create account
        </button>

        <p className="text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
