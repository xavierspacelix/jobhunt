"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AiSettingsForm,
  type AiSettingsInitial,
} from "@/components/ai-settings-form";

export function AiSetupPrompt() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<AiSettingsInitial>({
    hasLlmApiKey: false,
    llmBaseUrl: "",
    llmModel: "",
  });

  useEffect(() => {
    if (sessionStorage.getItem("aiSetupPromptedV2")) return;
    let cancelled = false;

    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const p = d.profile;
        if (!p || !(p.hasLlmApiKey && p.llmBaseUrl)) {
          setInitial({
            hasLlmApiKey: Boolean(p?.hasLlmApiKey),
            llmBaseUrl: p?.llmBaseUrl ?? "",
            llmModel: p?.llmModel ?? "",
          });
          setOpen(true);
        } else {
          sessionStorage.setItem("aiSetupPrompted", "1");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("aiSetupPromptedV2", "1");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) dismiss();
        else setOpen(true);
      }}
    >
      <DialogContent>
        <DialogTitle>Atur AI Match</DialogTitle>
        <DialogDescription>
          Agar pencocokan lowongan menggunakan AI, masukkan kunci API LLM Anda
          sendiri. Biaya ditanggung oleh masing-masing akun.
        </DialogDescription>
        <AiSettingsForm initial={initial} onSaved={dismiss} />
      </DialogContent>
    </Dialog>
  );
}
