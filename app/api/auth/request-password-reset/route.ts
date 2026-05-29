import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { sendMail } from "@/lib/mailer";
import { passwordResetEmail } from "@/lib/email-templates";
import { createResetToken, appBaseUrl } from "@/lib/password-reset";
import { passwordResetRequestSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Public, self-service password reset request. Always responds 200 regardless
// of whether the e-mail exists, to avoid leaking which accounts are registered.
export async function POST(req: NextRequest) {
  try {
    const { email } = passwordResetRequestSchema.parse(await req.json());
    const user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, active: true },
    });

    if (user && user.active) {
      const token = await createResetToken(user.id);
      const link = `${appBaseUrl()}/reset-password?token=${token}`;
      const { subject, html } = passwordResetEmail(user.name, link, false);
      // Swallow send errors so we don't reveal account existence or SMTP state.
      await sendMail({ to: user.email, subject, html }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
