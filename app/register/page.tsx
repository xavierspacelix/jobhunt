"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Check, ArrowRight, Loader2Icon } from "lucide-react";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

const steps = [
  { title: "Unggah CV", desc: "Dapatkan analisis skill & kekuatanmu." },
  {
    title: "Rekomendasi lowongan",
    desc: "Dari Glints & Jobstreet, cocok untukmu.",
  },
  {
    title: "Pantau lamaran",
    desc: "Progress tiap lamaran dalam satu dashboard.",
  },
];

function RegisterSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="cta"
      className="!h-11 w-full text-base"
      disabled={pending}
    >
      {pending ? (
        <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
      ) : (
        <ArrowRight className="size-4" />
      )}
      {pending ? "Membuat akun…" : "Daftar"}
    </Button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, {});

  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <aside className="bg-secondary text-foreground hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <BrandLogo className="text-lg" />

        <div className="space-y-9">
          <div>
            <h1 className="text-3xl leading-tight font-semibold">
              Lamaran kerja jadi lebih tenang.
            </h1>
            <p className="text-muted-foreground mt-3 max-w-sm">
              Satu tempat untuk analisis CV, rekomendasi lowongan, dan tracking
              progress lamaran.
            </p>
          </div>

          <ul className="space-y-4">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-3.5">
                <span className="bg-accent/10 text-accent flex size-9 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} JobHunter
        </p>
      </aside>

      <section className="bg-background flex items-center justify-center p-6">
        <form
          action={formAction}
          className="border-border bg-card w-full max-w-sm space-y-5 rounded-2xl border p-8 shadow-sm"
        >
          <div className="space-y-1">
            <h2 className="text-card-foreground text-2xl font-semibold tracking-tight">
              Buat akun
            </h2>
            <p className="text-muted-foreground text-sm">
              Mulai lacak lamaranmu.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-card-foreground text-sm font-medium"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-11 w-full cursor-text rounded-xl border px-3.5 py-2.5 focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-card-foreground text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Minimal 8 karakter"
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-11 w-full cursor-text rounded-xl border px-3.5 py-2.5 focus:ring-2 focus:outline-none"
            />
          </div>

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}

          <RegisterSubmit />

          <p className="text-muted-foreground text-center text-sm">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-accent font-medium hover:underline"
            >
              Masuk
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
