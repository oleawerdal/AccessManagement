// Creates an initial ADMIN user from environment variables, if one does not
// already exist. Runs in the production runtime image (no dev dependencies),
// so it uses the generated Prisma client and bcryptjs directly — not the
// TypeScript seed (which is for local development).
//
// Controlled by:
//   BOOTSTRAP_ADMIN_EMAIL     (required to do anything)
//   BOOTSTRAP_ADMIN_PASSWORD  (required to do anything)
//   BOOTSTRAP_ADMIN_NAME      (optional, defaults to "Administrator")

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME || "Administrator";

if (!email || !password) {
  console.log(
    "→ Bootstrap admin: BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set — skipping.",
  );
  process.exit(0);
}

const prisma = new PrismaClient();

try {
  const normalized = email.toLowerCase();
  const existing = await prisma.adminUser.findUnique({
    where: { email: normalized },
  });

  if (existing) {
    console.log(`→ Bootstrap admin: ${normalized} already exists — skipping.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({
      data: { email: normalized, name, passwordHash, role: "ADMIN" },
    });
    console.log(`→ Bootstrap admin: created ${normalized} (ADMIN).`);
  }
} catch (err) {
  console.error("✗ Bootstrap admin failed:", err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
