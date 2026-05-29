"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/api";
import { logLogin, logLoginFailed } from "@/lib/audit";
import { loginSchema } from "@/lib/validators";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Fyll inn gyldig e-post og passord." };
  }
  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  const h = headers();
  const ipAddress = getClientIp(h);
  const userAgent = h.get("user-agent") ?? undefined;

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      await logLoginFailed({
        adminEmail: email,
        reason: "invalid_credentials",
        ipAddress,
        userAgent,
      });
      return { error: "Feil e-post eller passord, eller deaktivert konto." };
    }
    throw err;
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (user) {
    await logLogin({
      adminUserId: user.id,
      adminEmail: user.email,
      ipAddress,
      userAgent,
    });
  }

  redirect("/dashboard");
}

// Kicks off the Microsoft Entra ID OAuth flow. The signIn callback in
// lib/auth.ts gates access to pre-provisioned, active admin users.
export async function entraSignInAction() {
  await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
}
