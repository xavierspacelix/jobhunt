import { z } from "zod";
import { STATUS_ORDER, type AppStatus } from "@/lib/kanban";

export const dateStringSchema = z.string().refine((value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    );
  }
  return z.string().datetime({ offset: true }).safeParse(value).success;
}, "Tanggal tidak valid");

export const applicationPatchSchema = z
  .object({
    status: z.enum(STATUS_ORDER).optional(),
    notes: z.string().max(5000).optional(),
    appliedAt: dateStringSchema.nullable().optional(),
    nextFollowUpAt: dateStringSchema.nullable().optional(),
    coverLetter: z.string().max(20000).nullable().optional(),
  })
  .strict();

type AppliedAtTransition = {
  currentStatus: AppStatus;
  currentAppliedAt: Date | null;
  nextStatus?: AppStatus;
  inputAppliedAt?: string | null;
  now?: Date;
};

export function resolveAppliedAt({
  currentStatus,
  currentAppliedAt,
  nextStatus,
  inputAppliedAt,
  now = new Date(),
}: AppliedAtTransition): Date | null | undefined {
  const targetStatus = nextStatus ?? currentStatus;
  if (targetStatus === "WISHLIST") return null;
  if (currentStatus === "WISHLIST") {
    return inputAppliedAt
      ? new Date(inputAppliedAt)
      : (currentAppliedAt ?? now);
  }
  if (inputAppliedAt === undefined) return undefined;
  return inputAppliedAt === null ? null : new Date(inputAppliedAt);
}

export function toOptionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}
