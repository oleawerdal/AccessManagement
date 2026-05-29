import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import type { AdminRole } from "@prisma/client";

import { prisma } from "./prisma";
import { logLogin } from "./audit";
import { getEntraConfig } from "./sso-config";
import { loginSchema } from "./validators";

const credentialsProvider = Credentials({
  name: "E-post og passord",
  credentials: {
    email: { label: "E-post", type: "email" },
    password: { label: "Passord", type: "password" },
  },
  async authorize(credentials) {
    const parsed = loginSchema.safeParse(credentials);
    if (!parsed.success) return null;

    const { email, password } = parsed.data;
    const user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.active) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    // Record sign-in time. No audit context here, so this write is not
    // auto-audited; the LOGIN event is logged explicitly by the login action.
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
});

const callbacks: NextAuthConfig["callbacks"] = {
  // Gate Microsoft Entra ID sign-ins: only a pre-provisioned, active admin
  // user (matched by e-mail) may sign in via SSO — we never auto-create
  // accounts here. Credentials are validated separately in authorize().
  async signIn({ user, account }) {
    if (account?.provider !== "microsoft-entra-id") return true;

    const email = user.email?.toLowerCase();
    if (!email) return false;
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.active) return false;

    await prisma.adminUser
      .update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

    // Log the SSO login here (the credentials path logs in the login action).
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    await logLogin({
      adminUserId: admin.id,
      adminEmail: admin.email,
      ipAddress: fwd ? fwd.split(",")[0]?.trim() : h.get("x-real-ip") ?? undefined,
      userAgent: h.get("user-agent") ?? undefined,
    });
    return true;
  },
  async jwt({ token, user }) {
    if (user) {
      if (user.role) {
        // Credentials sign-in: id/role already resolved in authorize().
        token.id = user.id as string;
        token.role = user.role;
      } else if (user.email) {
        // OAuth (Entra) sign-in: resolve the pre-provisioned admin record so
        // the token carries our internal id and role, not the IdP's.
        const admin = await prisma.adminUser.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (admin) {
          token.id = admin.id;
          token.role = admin.role;
        }
      }
    }
    return token;
  },
  session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role as AdminRole;
    }
    return session;
  },
};

// Lazy (per-request) config so the Entra provider can be enabled/configured
// from the database (Settings → SSO) without a redeploy. getEntraConfig() is
// cached, so this adds negligible overhead. Falls back to AUTH_ENTRA_* env.
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const providers: NextAuthConfig["providers"] = [credentialsProvider];

  const entra = await getEntraConfig();
  if (entra) {
    providers.push(
      MicrosoftEntraID({
        clientId: entra.clientId,
        clientSecret: entra.clientSecret,
        issuer: entra.issuer,
      }),
    );
  }

  return {
    trustHost: true,
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers,
    callbacks,
  } satisfies NextAuthConfig;
});
