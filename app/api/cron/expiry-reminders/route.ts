import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendMail, MailNotConfiguredError } from "@/lib/mailer";
import { expiryDigestEmail, type ExpiredItem } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

// Protected by CRON_SECRET (Authorization: Bearer <secret>). Intended to be
// called on a schedule (e.g. a daily Coolify scheduled task / external cron).
// Finds assignments that have expired and not yet been notified, e-mails the
// affected system owners and all active admins, and marks them notified so each
// expiry is reported only once.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET er ikke konfigurert." },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Ugyldig cron-secret." }, { status: 401 });
  }

  const now = new Date();
  const [expired, expiredResource] = await Promise.all([
    prisma.roleAssignment.findMany({
      where: {
        revokedAt: null,
        expiryNotifiedAt: null,
        expiresAt: { not: null, lte: now },
      },
      include: {
        person: { select: { firstName: true, lastName: true, email: true } },
        role: {
          select: {
            name: true,
            system: {
              select: {
                name: true,
                ownerEmail: true,
                ownerPerson: { select: { email: true } },
              },
            },
          },
        },
      },
    }),
    // Physical resource accesses use the same expiry + notification model.
    prisma.resourceAccess.findMany({
      where: {
        revokedAt: null,
        expiryNotifiedAt: null,
        expiresAt: { not: null, lte: now },
      },
      include: {
        person: { select: { firstName: true, lastName: true, email: true } },
        method: { select: { label: true } },
        resource: {
          select: {
            name: true,
            ownerPerson: { select: { email: true } },
          },
        },
      },
    }),
  ]);

  if (expired.length === 0 && expiredResource.length === 0) {
    return NextResponse.json({ ok: true, expired: 0, emailsSent: 0 });
  }

  // Per-owner buckets (owners only see their own resources' expirations).
  const byOwner = new Map<string, ExpiredItem[]>();
  const addToOwner = (owner: string | undefined | null, item: ExpiredItem) => {
    const key = owner?.trim();
    if (!key) return;
    (byOwner.get(key) ?? byOwner.set(key, []).get(key)!).push(item);
  };

  const assignmentItems: ExpiredItem[] = expired.map((a) => ({
    personName: `${a.person.firstName} ${a.person.lastName}`,
    personEmail: a.person.email,
    systemName: a.role.system.name,
    roleName: a.role.name,
    expiresAt: a.expiresAt,
  }));
  expired.forEach((a, i) => {
    addToOwner(
      a.role.system.ownerPerson?.email ?? a.role.system.ownerEmail,
      assignmentItems[i],
    );
  });

  const resourceItems: ExpiredItem[] = expiredResource.map((a) => ({
    personName: `${a.person.firstName} ${a.person.lastName}`,
    personEmail: a.person.email,
    systemName: a.resource.name,
    roleName: a.method.label,
    expiresAt: a.expiresAt,
  }));
  expiredResource.forEach((a, i) => {
    addToOwner(a.resource.ownerPerson?.email, resourceItems[i]);
  });

  const items: ExpiredItem[] = [...assignmentItems, ...resourceItems];

  const admins = await prisma.adminUser.findMany({
    where: { active: true },
    select: { email: true },
  });
  const adminEmails = admins.map((a) => a.email);

  try {
    let emailsSent = 0;
    if (adminEmails.length > 0) {
      const { subject, html } = expiryDigestEmail(items, "i systemene og på ressurser");
      await sendMail({ to: adminEmails, subject, html });
      emailsSent += 1;
    }
    for (const [owner, ownerItems] of byOwner) {
      const { subject, html } = expiryDigestEmail(ownerItems, "du eier");
      await sendMail({ to: owner, subject, html });
      emailsSent += 1;
    }

    await Promise.all([
      prisma.roleAssignment.updateMany({
        where: { id: { in: expired.map((a) => a.id) } },
        data: { expiryNotifiedAt: now },
      }),
      prisma.resourceAccess.updateMany({
        where: { id: { in: expiredResource.map((a) => a.id) } },
        data: { expiryNotifiedAt: now },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      expired: expired.length + expiredResource.length,
      emailsSent,
    });
  } catch (err) {
    if (err instanceof MailNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Ukjent feil.";
    // Not marked as notified, so a later run retries.
    return NextResponse.json(
      { error: `Sending feilet: ${message}` },
      { status: 502 },
    );
  }
}
