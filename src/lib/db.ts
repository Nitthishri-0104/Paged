import { PrismaClient } from "@prisma/client";

// Next.js reloads modules on every file change in dev, which would otherwise
// spin up a new PrismaClient (and a new connection pool) per hot reload.
// Caching the instance on `globalThis` survives those reloads while staying
// a fresh singleton per server process in production.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
