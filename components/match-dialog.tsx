"use client"

import * as React from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { MatchPanel } from "@/components/match-panel"
import { Button } from "@/components/ui/button"
import { SparklesIcon } from "lucide-react"

export function MatchDialog({
  jobId,
  trigger,
  onComplete,
  forceRefresh = false,
}: {
  jobId: string
  trigger?: React.ReactElement
  forceRefresh?: boolean
  onComplete?: (result: {
    score: number
    matchedSkills: string[]
    missingSkills: string[]
  }) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <SparklesIcon className="size-4" />
              Cek Kecocokan
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogTitle>Kecocokan dengan CV</DialogTitle>
        <DialogDescription>
          Skor kecocokan profil CV dengan lowongan ini.
        </DialogDescription>
        <div className="mt-4">
          <MatchPanel
            jobId={jobId}
            autoRun={open}
            forceRefresh={forceRefresh}
            onComplete={onComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
