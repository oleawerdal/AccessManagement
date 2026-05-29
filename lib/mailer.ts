import nodemailer from "nodemailer";

import { prisma } from "./prisma";

export class MailNotConfiguredError extends Error {
  constructor(message = "SMTP er ikke konfigurert eller aktivert.") {
    super(message);
    this.name = "MailNotConfiguredError";
  }
}

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export function getSmtpSettings() {
  return prisma.smtpSettings.findUnique({ where: { id: "default" } });
}

/**
 * Send an e-mail using the SMTP settings stored in the database. Throws
 * MailNotConfiguredError when no enabled configuration exists.
 */
export async function sendMail(msg: MailMessage): Promise<void> {
  const s = await getSmtpSettings();
  if (!s || !s.enabled) throw new MailNotConfiguredError();

  const transport = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: s.username ? { user: s.username, pass: s.password ?? "" } : undefined,
  });

  await transport.sendMail({
    from: `"${s.fromName}" <${s.fromEmail}>`,
    to: Array.isArray(msg.to) ? msg.to.join(", ") : msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text ?? stripHtml(msg.html),
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
