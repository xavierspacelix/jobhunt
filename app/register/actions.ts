"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { z } from "zod";
import { redirect } from "next/navigation";

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email sudah terdaftar." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, passwordHash } });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/dashboard");
}
