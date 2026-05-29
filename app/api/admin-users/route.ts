import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { adminUserCreateSchema } from "@/lib/validators";
import { sendMail, MailNotConfiguredError } from "@/lib/mailer";
import { passwordResetEmail } from "@/lib/email-templates";
import { createResetToken, appBaseUrl } from "@/lib/password-reset";

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const users = await prisma.adminUser.findMany({
      orderBy: { name: "asc" },
      select: SAFE_SELECT,
    });
    return NextResponse.json(users);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = adminUserCreateSchema.parse(await req.json());
    const invite = !data.password;

    // For invited users we store a random, unguessable hash so the account
    // cannot be used until they set a password via the e-mailed link.
    const passwordHash = await bcrypt.hash(
      data.password ?? randomBytes(32).toString("base64url"),
      12,
    );
    const created = await prisma.adminUser.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        active: data.active,
        passwordHash,
      },
      select: SAFE_SELECT,
    });

    if (!invite) {
      return NextResponse.json({ ...created, emailSent: false }, { status: 201 });
    }

    // Send the invitation (set-password) link.
    try {
      const token = await createResetToken(created.id);
      const link = `${appBaseUrl()}/reset-password?token=${token}`;
      const { subject, html } = passwordResetEmail(created.name, link, true);
      await sendMail({ to: created.email, subject, html });
      return NextResponse.json({ ...created, emailSent: true }, { status: 201 });
    } catch (err) {
      const reason =
        err instanceof MailNotConfiguredError
          ? "SMTP er ikke konfigurert."
          : err instanceof Error
            ? err.message
            : "Ukjent feil.";
      // The user exists; an admin can re-send the link from Settings.
      return NextResponse.json(
        { ...created, emailSent: false, emailError: reason },
        { status: 201 },
      );
    }
  });
}
