import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a function to get Prisma client
export const getPrismaClient = () => {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

// Export a getter instead of direct instance
export const db = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    const client = getPrismaClient()
    return client[prop as keyof PrismaClient]
  }
})

// Only try to connect in non-build environments
if (env.NODE_ENV !== 'production' || process.env.BUILDING !== 'true') {
  getPrismaClient()
}