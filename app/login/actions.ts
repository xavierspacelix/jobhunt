"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

type State = { error?: string };

export async function loginAction(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      return { error: "Email atau password salah." };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email atau password salah." };
    }
    throw error;
  }

  redirect("/dashboard");
}
