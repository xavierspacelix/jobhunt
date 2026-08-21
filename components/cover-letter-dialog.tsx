"use client"

import * as React from "react"
import { CopyIcon, FileTextIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function CoverLetterDialog({
  trigger,
  applicationId,
  initialCoverLetter,
  jobTitle,
  company,
}: {
  trigger?: React.ReactElement
  applicationId: string
  initialCoverLetter?: string | null
  jobTitle?: string
  company?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(initialCoverLetter ?? "")
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const generate = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat cover letter.")
      } else {
        setDraft(data.coverLetter ?? "")
      }
    } catch {
      setError("Terjadi kesalahan jaringan.")
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next && !initialCoverLetter) {
      void generate()
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coverLetter: draft }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Gagal menyimpan.")
      }
    } finally {
      setSaving(false)
    }
  }

  const copy = () => {
    navigator.clipboard?.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <FileTextIcon className="size-4" />
              Buat Cover Letter
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogTitle>
          Cover Letter{jobTitle ? ` — ${jobTitle}` : ""}
        </DialogTitle>
        <DialogDescription>
          {company ? `Untuk lamaran di ${company}.` : ""} Edit draft sesuai
          kebutuhan, lalu salin atau simpan.
        </DialogDescription>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={generate}
              disabled={loading}
              size="sm"
            >
              {loading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              {draft ? "Generate ulang" : "Generate (AI)"}
            </Button>
            <Button
              variant="outline"
              onClick={copy}
              disabled={!draft}
              size="sm"
            >
              <CopyIcon className="size-4" />
              {copied ? "Tersalin" : "Salin"}
            </Button>
            <Button onClick={save} disabled={saving || !draft} size="sm">
              {saving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <FileTextIcon className="size-4" />
              )}
              Simpan
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Textarea
            className="min-h-[18rem] font-mono text-xs leading-relaxed"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Klik Generate (AI) untuk membuat draft cover letter…"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
