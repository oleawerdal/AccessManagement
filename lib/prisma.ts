import { PrismaClient } from "@prisma/client";
import { auditExtension } from "./audit";

const globalForPrisma = globalThis as unknown as {
  prismaBase?: PrismaClient;
};

const base =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = base;
}

/**
 * Application-wide Prisma client with the audit extension applied. All API
 * routes and server actions must use this client so mutations are logged.
 */
export const prisma = base.$extends(auditExtension());

export type AppPrismaClient = typeof prisma;
