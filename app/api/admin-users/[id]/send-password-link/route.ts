import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { sendMail, MailNotConfiguredError } from "@/lib/mailer";
import { passwordResetEmail } from "@/lib/email-templates";
import { createResetToken, appBaseUrl } from "@/lib/password-reset";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

// Admin action: e-mail a "set / reset password" link to an admin user.
export async function POST(_req: Request, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const user = await prisma.adminUser.findUniqueOrThrow({
      where: { id: params.id },
      select: { id: true, name: true, email: true, lastLoginAt: true },
    });

    const token = await createResetToken(user.id);
    const link = `${appBaseUrl()}/reset-password?token=${token}`;
    const isNew = user.lastLoginAt === null;

    try {
      const { subject, html } = passwordResetEmail(user.name, link, isNew);
      await sendMail({ to: user.email, subject, html });
      return NextResponse.json({ ok: true, to: user.email });
    } catch (err) {
      if (err instanceof MailNotConfiguredError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      const message = err instanceof Error ? err.message : "Ukjent feil.";
      return NextResponse.json(
        { error: `Sending feilet: ${message}` },
        { status: 502 },
      );
    }
  });
}
