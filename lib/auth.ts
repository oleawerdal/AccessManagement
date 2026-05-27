import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import type { AdminRole } from "@prisma/client";

import { prisma } from "./prisma";
import { loginSchema } from "./validators";

const entraEnabled = process.env.AUTH_ENTRA_ENABLED === "true";

const providers: NextAuthConfig["providers"] = [
  Credentials({
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

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
  }),
];

// Microsoft Entra ID SSO is prepared but only registered when explicitly
// enabled via env, so credentials remain the default method.
if (entraEnabled) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
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
  },
});
