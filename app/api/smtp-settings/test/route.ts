import { NextResponse } from "next/server";

import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { sendMail, MailNotConfiguredError } from "@/lib/mailer";
import { testEmail } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

// Sends a test e-mail to the signed-in admin using the saved SMTP settings.
export async function POST() {
  return withApi(async (session) => {
    assertCanMutate(session);
    const to = session.user.email;
    if (!to) {
      return NextResponse.json(
        { error: "Innlogget bruker mangler e-postadresse." },
        { status: 400 },
      );
    }
    try {
      const { subject, html } = testEmail();
      await sendMail({ to, subject, html });
      return NextResponse.json({ ok: true, to });
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
