"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

const steps = [
  { title: "Unggah CV", desc: "Dapatkan analisis skill & kekuatanmu." },
  { title: "Rekomendasi lowongan", desc: "Dari Glints & Jobstreet, cocok untukmu." },
  { title: "Pantau lamaran", desc: "Progress tiap lamaran dalam satu dashboard." },
];

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <aside className="hidden flex-col justify-between bg-secondary p-10 text-foreground lg:flex xl:p-14">
        <BrandLogo className="text-lg" />

        <div className="space-y-9">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">Lamaran kerja jadi lebih tenang.</h1>
            <p className="mt-3 max-w-sm text-muted-foreground">
              Satu tempat untuk analisis CV, rekomendasi lowongan, dan tracking progress lamaran.
            </p>
          </div>

          <ul className="space-y-4">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Check className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} JobHunter</p>
      </aside>

      <section className="flex items-center justify-center bg-background p-6">
        <form
          action={formAction}
          className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">Masuk</h2>
            <p className="text-sm text-muted-foreground">Selamat datang kembali.</p>
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
              className="w-full cursor-text rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              placeholder="••••••••"
              className="w-full cursor-text rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" variant="cta" className="w-full !h-11 text-base">
            Masuk
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/register" className="font-medium text-accent hover:underline">
              Daftar
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
