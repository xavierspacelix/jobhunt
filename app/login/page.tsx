"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Briefcase, FileText, Sparkles, ListChecks, ArrowRight } from "lucide-react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: FileText, title: "Unggah CV", desc: "Dapatkan analisis skill & kekuatanmu." },
  { icon: Sparkles, title: "Rekomendasi lowongan", desc: "Dari Glints & Jobstreet, cocok untukmu." },
  { icon: ListChecks, title: "Pantau lamaran", desc: "Progress tiap lamaran dalam satu dashboard." },
];

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <Briefcase className="size-6" />
          JobHunter
        </div>

        <div className="space-y-10">
          <div>
            <h1 className="text-3xl font-bold leading-tight">Lamaran kerja jadi lebih teratur.</h1>
            <p className="mt-3 max-w-sm text-primary-foreground/80">
              Satu tempat untuk analisis CV, rekomendasi lowongan, dan tracking progress lamaran.
            </p>
          </div>

          <ol className="space-y-5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <s.icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{`${i + 1}. ${s.title}`}</p>
                  <p className="text-sm text-primary-foreground/75">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} JobHunter</p>
      </aside>

      <section className="flex items-center justify-center bg-background p-6">
        <form
          action={formAction}
          className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-7 shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-card-foreground">Masuk</h2>
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
              placeholder="••••••••"
              className="w-full cursor-text rounded-lg border border-border bg-white px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" variant="cta" className="w-full !h-11 text-base">
            Masuk
            <ArrowRight className="size-4" />
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Daftar
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
