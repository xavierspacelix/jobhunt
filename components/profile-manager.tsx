"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import {
  FileText,
  Loader2,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  InfoIcon,
  PencilIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExperienceEntry = {
  role?: string
  company?: string
  period?: string
}
type EducationEntry = {
  school?: string
  degree?: string
  period?: string
}
type CertificationEntry = {
  name?: string
  issuer?: string
  period?: string
}

type Profile = {
  id: string
  userId: string
  rawText: string | null
  fullName: string | null
  headline: string | null
  location: string | null
  email: string | null
  phone: string | null
  skills: string[]
  summary: string | null
  experience: ExperienceEntry[] | null
  education: EducationEntry[] | null
  certifications: CertificationEntry[] | null
  links: string[] | null
  cvKey: string | null
  parsedWith: string | null
  createdAt: string
  updatedAt: string
}

type DraftEntry = Record<string, string>

type Draft = {
  fullName: string
  headline: string
  location: string
  email: string
  phone: string
  summary: string
  skills: string[]
  experience: DraftEntry[]
  education: DraftEntry[]
  certifications: DraftEntry[]
  links: string[]
}

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring"

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
      {children}
    </span>
  )
}

function ResultCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function toDraft(p: Profile): Draft {
  return {
    fullName: p.fullName ?? "",
    headline: p.headline ?? "",
    location: p.location ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    summary: p.summary ?? "",
    skills: p.skills ?? [],
    experience: (p.experience ?? []).map((e) => ({
      role: e.role ?? "",
      company: e.company ?? "",
      period: e.period ?? "",
    })),
    education: (p.education ?? []).map((e) => ({
      school: e.school ?? "",
      degree: "degree" in e ? String((e as Record<string, unknown>).degree ?? "") : "",
    })),
    certifications: (p.certifications ?? []).map((e) => ({
      name: e.name ?? "",
      issuer: e.issuer ?? "",
      period: e.period ?? "",
    })),
    links: p.links ?? [],
  }
}

function EntriesEditor({
  entries,
  columns,
  onAdd,
  onChange,
  addLabel,
}: {
  entries: DraftEntry[]
  columns: { key: string; label: string; placeholder?: string }[]
  onAdd: () => void
  onChange: (next: DraftEntry[]) => void
  addLabel: string
}) {
  const update = (i: number, key: string, val: string) =>
    onChange(entries.map((e, i2) => (i2 === i ? { ...e, [key]: val } : e)))
  const remove = (i: number) => onChange(entries.filter((_, i2) => i2 !== i))

  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={i} className="rounded-lg border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {columns.map((col) => (
              <label key={col.key} className="block">
                <span className="text-xs text-muted-foreground">{col.label}</span>
                <input
                  value={e[col.key] ?? ""}
                  placeholder={col.placeholder}
                  onChange={(ev) => update(i, col.key, ev.target.value)}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mt-2 text-xs text-destructive hover:underline"
          >
            Hapus
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        + {addLabel}
      </Button>
    </div>
  )
}

function SkillEditor({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState("")
  const add = (raw: string) => {
    const parts = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const next = [...value]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    onChange(next)
    setInput("")
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
        >
          {s}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== s))}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Hapus ${s}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            if (input) add(input)
          }
        }}
        onBlur={() => input && add(input)}
        placeholder="Tambah skill…"
        className={cn(inputClass, "inline-flex w-auto min-w-[140px] flex-1")}
      />
    </div>
  )
}

function LinksEditor({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const set = (i: number, val: string) =>
    onChange(value.map((v, i2) => (i2 === i ? val : v)))
  const remove = (i: number) => onChange(value.filter((_, i2) => i2 !== i))
  return (
    <div className="space-y-2">
      {value.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={link}
            onChange={(e) => set(i, e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-xs text-sm text-destructive hover:underline"
            aria-label="Hapus tautan"
          >
            ×
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, ""])}
      >
        + Tambah tautan
      </Button>
    </div>
  )
}

export function ProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/profile")
        if (!active || !res.ok) return
        const data = (await res.json()) as {
          profile: Profile | null
          cvUrl: string | null
        }
        setProfile(data.profile)
        setCvUrl(data.cvUrl)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setSuccess(false)

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)")
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: form,
      })
      const data = (await res.json()) as {
        profile?: Profile
        cvUrl?: string | null
        error?: string
      }
      if (!res.ok || !data.profile) {
        setError(data.error ?? "Upload failed")
        return
      }
      setProfile(data.profile)
      setCvUrl(data.cvUrl ?? null)
      setSuccess(true)
    } catch {
      setError("Something went wrong while uploading")
    } finally {
      setUploading(false)
    }
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void handleFile(file)
    },
    [handleFile],
  )

  const startEdit = () => {
    if (!profile) return
    setDraft(toDraft(profile))
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
  }

  const saveEdit = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: draft.fullName,
          headline: draft.headline,
          location: draft.location,
          email: draft.email,
          phone: draft.phone,
          summary: draft.summary,
          skills: draft.skills,
          experience: draft.experience,
          education: draft.education,
          certifications: draft.certifications,
          links: draft.links,
        }),
      })
      const data = (await res.json()) as {
        profile?: Profile
        error?: string
      }
      if (!res.ok || !data.profile) {
        setError(data.error ?? "Gagal menyimpan")
        return
      }
      setProfile(data.profile)
      setEditing(false)
      setDraft(null)
    } catch {
      setError("Something went wrong while saving")
    } finally {
      setSaving(false)
    }
  }

  const isHeuristic = profile?.parsedWith === "heuristic"

  const updateDraft = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d))

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Profil &amp; CV</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Unggah CV (PDF) untuk mengekstrak data profil secara otomatis, lalu
              edit hasilnya.
            </p>
          </div>
          {profile && !editing && (
            <Button variant="outline" onClick={startEdit}>
              <PencilIcon className="size-4" /> Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button variant="cta" onClick={saveEdit} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Simpan"
                )}
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                Batal
              </Button>
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
            dragging
              ? "border-accent bg-accent/5"
              : "border-border bg-background/40 hover:border-accent/60",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ""
            }}
          />
          {uploading ? (
            <Loader2 className="size-8 animate-spin text-accent" />
          ) : (
            <UploadCloud className="size-8 text-accent" />
          )}
          <p className="mt-3 font-medium text-foreground">
            {uploading ? "Memproses CV…" : "Tarik PDF ke sini atau klik untuk pilih"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Maksimal 5MB, PDF saja</p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
            <CheckCircle2 className="size-4 shrink-0" />
            CV berhasil diproses.
          </div>
        )}

        {isHeuristic && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              Hasil ekstraksi menggunakan heuristik (tanpa AI) sehingga kualitasnya
              terbatas. Atur{" "}
              <code className="rounded bg-background/60 px-1 py-0.5 text-xs">
                LLM_API_KEY
              </code>{" "}
              &amp;{" "}
              <code className="rounded bg-background/60 px-1 py-0.5 text-xs">
                LLM_BASE_URL
              </code>{" "}
              untuk hasil lebih akurat.
            </span>
          </div>
        )}

        {cvUrl && !editing && (
          <div className="mt-4">
            <Button variant="cta" render={<a href={cvUrl} target="_blank" rel="noreferrer" />}>
              <FileText className="size-4" /> Lihat CV asli
            </Button>
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat profil…
        </div>
      ) : profile ? (
        editing && draft ? (
          <div className="space-y-4">
            <ResultCard title="Profil">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Nama Lengkap</span>
                  <input
                    value={draft.fullName}
                    onChange={(e) => updateDraft({ fullName: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Headline / Title</span>
                  <input
                    value={draft.headline}
                    onChange={(e) => updateDraft({ headline: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Lokasi</span>
                  <input
                    value={draft.location}
                    onChange={(e) => updateDraft({ location: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <input
                    value={draft.email}
                    onChange={(e) => updateDraft({ email: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Telepon</span>
                  <input
                    value={draft.phone}
                    onChange={(e) => updateDraft({ phone: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
            </ResultCard>

            <ResultCard title="Ringkasan">
              <textarea
                value={draft.summary}
                onChange={(e) => updateDraft({ summary: e.target.value })}
                rows={4}
                className={cn(inputClass, "resize-y")}
              />
            </ResultCard>

            <ResultCard title="Keahlian">
              <SkillEditor
                value={draft.skills}
                onChange={(v) => updateDraft({ skills: v })}
              />
            </ResultCard>

            <ResultCard title="Pengalaman">
              <EntriesEditor
                entries={draft.experience}
                columns={[
                  { key: "role", label: "Role" },
                  { key: "company", label: "Perusahaan" },
                  { key: "period", label: "Periode" },
                ]}
                addLabel="Tambah pengalaman"
                onAdd={() =>
                  updateDraft({ experience: [...draft.experience, {}] })
                }
                onChange={(v) => updateDraft({ experience: v })}
              />
            </ResultCard>

            <ResultCard title="Pendidikan">
              <EntriesEditor
                entries={draft.education}
                columns={[
                  { key: "school", label: "Sekolah / Universitas" },
                  { key: "degree", label: "Gelar / Jurusan" },
                  { key: "period", label: "Periode" },
                ]}
                addLabel="Tambah pendidikan"
                onAdd={() => updateDraft({ education: [...draft.education, {}] })}
                onChange={(v) => updateDraft({ education: v })}
              />
            </ResultCard>

            <ResultCard title="Sertifikat">
              <EntriesEditor
                entries={draft.certifications}
                columns={[
                  { key: "name", label: "Nama Sertifikat" },
                  { key: "issuer", label: "Penerbit" },
                  { key: "period", label: "Periode" },
                ]}
                addLabel="Tambah sertifikat"
                onAdd={() =>
                  updateDraft({ certifications: [...draft.certifications, {}] })
                }
                onChange={(v) => updateDraft({ certifications: v })}
              />
            </ResultCard>

            <ResultCard title="Tautan">
              <LinksEditor
                value={draft.links}
                onChange={(v) => updateDraft({ links: v })}
              />
            </ResultCard>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <ResultCard title="Profil" className="md:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama Lengkap" value={profile.fullName} />
                <Field label="Headline" value={profile.headline} />
                <Field label="Lokasi" value={profile.location} />
                <Field label="Email" value={profile.email} />
                <Field label="Telepon" value={profile.phone} />
              </div>
            </ResultCard>

            <ResultCard title="Ringkasan" className="md:col-span-2">
              <p className="text-foreground">
                {profile.summary || "Belum ada ringkasan."}
              </p>
            </ResultCard>

            <ResultCard title={`Keahlian (${profile.skills.length})`}>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Chip key={skill}>{skill}</Chip>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Belum terdeteksi.</span>
              )}
            </ResultCard>

            <ResultCard title="Tautan">
              {profile.links && profile.links.length > 0 ? (
                <ul className="space-y-1">
                  {profile.links.map((link, i) => (
                    <li key={i}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-accent hover:underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">Belum terdeteksi.</span>
              )}
            </ResultCard>

            <ResultCard title="Pengalaman" className="md:col-span-2">
              <EntryList
                entries={profile.experience}
                primary="role"
                secondary="company"
              />
            </ResultCard>

            <ResultCard title="Pendidikan" className="md:col-span-2">
              <EntryList
                entries={profile.education}
                primary="school"
                secondary="degree"
              />
            </ResultCard>

            <ResultCard title="Sertifikat" className="md:col-span-2">
              <EntryList
                entries={profile.certifications}
                primary="name"
                secondary="issuer"
              />
            </ResultCard>
          </div>
        )
      ) : (
        !error && (
          <ResultCard title="Mulai">
            <p className="text-muted-foreground">
              Belum ada CV. Unggah PDF di atas untuk memulai.
            </p>
          </ResultCard>
        )
      )}
    </div>
  )
}

function EntryList<T extends { period?: string }>({
  entries,
  primary,
  secondary,
}: {
  entries: T[] | null
  primary: keyof T
  secondary: keyof T
}) {
  if (!entries || entries.length === 0) {
    return <span className="text-muted-foreground">Belum terdeteksi.</span>
  }
  return (
    <ul className="space-y-3">
      {entries.map((e, i) => {
        const p = e[primary] as string | undefined
        const s = e[secondary] as string | undefined
        const period = e.period
        if (!p && !s && !period) return null
        return (
          <li key={i} className="text-foreground">
            {p && <span className="font-medium">{p}</span>}
            {p && s && <span className="text-muted-foreground"> di </span>}
            {s && <span className="font-medium">{s}</span>}
            {period && (
              <span className="block text-sm text-muted-foreground">{period}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
