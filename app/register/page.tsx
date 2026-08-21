"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, {});

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <Briefcase className="size-6" />
          JobHunter
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight">Mulai lacak lamaranmu hari ini.</h1>
          <p className="max-w-sm text-primary-foreground/80">
            Buat akun gratis, unggah CV, dan biarkan AI membantumu menemukan lowongan yang tepat.
          </p>
        </div>

        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} JobHunter</p>
      </aside>

      <section className="flex items-center justify-center bg-background p-6">
        <form
          action={formAction}
          className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-7 shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-card-foreground">Buat akun</h2>
            <p className="text-sm text-muted-foreground">Mulai tracking lamaranmu.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-card-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full cursor-text rounded-lg border border-border bg-white px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-card-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Minimal 8 karakter"
              className="w-full cursor-text rounded-lg border border-border bg-white px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" variant="cta" className="w-full !h-11 text-base">
            Daftar
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
