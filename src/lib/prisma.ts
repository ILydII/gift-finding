import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 has no bundled query engine — the runtime client connects through a
// driver adapter. We use node-postgres against Postgres (Supabase). On Vercel,
// point DATABASE_URL at Supabase's transaction pooler (port 6543); use the
// direct connection (port 5432) as DIRECT_URL for migrations only.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
