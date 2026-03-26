/**
 * Prisma client accessor for PostgreSQL state store.
 * Returns null if Prisma client isn't generated yet (run: pnpm prisma generate).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _prisma: any = null;

export async function getPrisma(): Promise<unknown> {
  if (_prisma) return _prisma;
  try {
    // @prisma/client default export varies by version
    const mod = await import('@prisma/client');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (mod as any).PrismaClient ?? (mod as any).default?.PrismaClient;
    if (!Ctor) throw new Error('PrismaClient not found in @prisma/client');
    _prisma = new Ctor({
      log: process.env.LOG_LEVEL === 'debug'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  } catch {
    console.warn('[DB] Prisma client not available. Run: pnpm prisma generate');
  }
  return _prisma;
}
