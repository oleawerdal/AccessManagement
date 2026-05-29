import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { consumeResetToken } from "@/lib/password-reset";
import { passwordResetConfirmSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Public: complete a password reset using a single-use token.
export async function POST(req: NextRequest) {
  try {
    const { token, password } = passwordResetConfirmSchema.parse(
      await req.json(),
    );

    const adminUserId = await consumeResetToken(token);
    if (!adminUserId) {
      return NextResponse.json(
        { error: "Ugyldig eller utløpt lenke. Be om en ny." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.adminUser.update({
      where: { id: adminUserId },
      data: { passwordHash, active: true },
      select: { id: true, email: true },
    });

    await writeAuditLog({
      action: "UPDATE",
      entityType: "AdminUser",
      entityId: user.id,
      entityLabel: user.email,
      metadata: { action: "password_reset" },
      context: { adminEmail: user.email },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
