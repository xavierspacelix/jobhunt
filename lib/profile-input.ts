import { z } from "zod";

const nullableText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim() || null);

const optionalEntryText = z.string().trim().max(500).optional();

const experienceSchema = z
  .object({
    role: optionalEntryText,
    company: optionalEntryText,
    period: optionalEntryText,
  })
  .strict();
const educationSchema = z
  .object({
    school: optionalEntryText,
    degree: optionalEntryText,
    period: optionalEntryText,
  })
  .strict();
const certificationSchema = z
  .object({
    name: optionalEntryText,
    issuer: optionalEntryText,
    period: optionalEntryText,
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    fullName: nullableText(200),
    headline: nullableText(300),
    location: nullableText(300),
    email: z
      .string()
      .trim()
      .max(320)
      .refine(
        (value) => value === "" || z.string().email().safeParse(value).success,
        "Email tidak valid",
      )
      .transform((value) => value || null),
    phone: nullableText(100),
    summary: nullableText(5000),
    skills: z.array(z.string().trim().min(1).max(100)).max(100),
    experience: z.array(experienceSchema).max(100),
    education: z.array(educationSchema).max(100),
    certifications: z.array(certificationSchema).max(100),
    links: z
      .array(z.string().trim().max(2000))
      .max(100)
      .transform((links) => links.filter(Boolean)),
    llmBaseUrl: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim() === ""
            ? undefined
            : value,
        z.string().trim().url("URL tidak valid").max(500).optional(),
      ),
    llmApiKey: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => (value === "" ? null : value)),
    llmModel: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim() === ""
            ? undefined
            : value,
        z.string().trim().max(200).optional(),
      ),
  })
  .partial()
  .strict();

export function parseProfileUpdate(value: unknown) {
  return profileUpdateSchema.safeParse(value);
}
