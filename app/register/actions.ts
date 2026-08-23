"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { z } from "zod";
import { redirect } from "next/navigation";
import { registerRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type State = { error?: string };

export async function registerAction(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email valid dan password minimal 8 karakter." };
  }

  const { email, password } = parsed.data;
  const forwardedFor = (await headers()).get("x-forwarded-for");
  const clientAddress = forwardedFor?.split(",")[0]?.trim() || "unknown";
  if (
    !registerRateLimit(`ip:${clientAddress}`) ||
    !registerRateLimit(`email:${email.toLowerCase()}`)
  ) {
    return { error: "Pendaftaran terlalu sering. Coba lagi beberapa saat." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({ data: { email, passwordHash } });
  } catch {
    return {
      error: "Akun tidak dapat dibuat. Periksa data atau gunakan halaman masuk.",
    };
  }

  await signIn("credentials", { email, password, redirect: false });
  redirect("/dashboard");
}
