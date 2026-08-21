"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/dashboard/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, disabled: false },
  { href: "/profile", label: "Profil & CV", icon: FileText, disabled: false },
  { href: "#", label: "Pelacak Lamaran", icon: Briefcase, disabled: true },
  { href: "#", label: "Pengaturan", icon: Settings, disabled: true },
] as const;

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navList = (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {NAV.map((item) => {
        const active = !item.disabled && pathname === item.href;
        const Icon = item.icon;
        const base =
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors";
        const state = active
          ? "bg-accent/10 font-medium text-accent"
          : "text-muted-foreground hover:bg-muted hover:text-foreground";
        const disabledCls = item.disabled ? "cursor-not-allowed opacity-50" : "";
        return (
          <Link
            key={item.label}
            href={item.disabled ? "#" : item.href}
            onClick={() => setOpen(false)}
            aria-disabled={item.disabled}
            aria-current={active ? "page" : undefined}
            className={`${base} ${state} ${disabledCls}`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.disabled && (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-3 border-t border-border px-3 py-4">
      <div className="flex items-center justify-between gap-2 px-2">
        <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
        <ThemeToggle />
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition-opacity hover:opacity-90"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  );

  const panel = (
    <div className="flex h-full flex-col bg-card">
      <div className="px-5 py-5">
        <BrandLogo />
      </div>
      {navList}
      {footer}
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <BrandLogo className="text-base" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="rounded-lg p-2 text-foreground hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <aside className="hidden w-64 shrink-0 border-r border-border lg:flex">
        {panel}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border shadow-lg">
            {panel}
          </aside>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="absolute right-4 top-4 rounded-lg p-2 text-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </>
  );
}
