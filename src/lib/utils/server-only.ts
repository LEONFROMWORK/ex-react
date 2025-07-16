// Server-only code protection utility

export const isServer = typeof window === 'undefined'
export const isClient = !isServer
export const isBuildTime = process.env.BUILDING === 'true'

// Wrapper for server-only code
export function serverOnly<T>(fn: () => T): T | null {
  if (isServer && !isBuildTime) {
    return fn()
  }
  return null
}

// Wrapper for client-only code
export function clientOnly<T>(fn: () => T): T | null {
  if (isClient) {
    return fn()
  }
  return null
}

// Safe dynamic import for server modules
export async function serverImport<T>(importFn: () => Promise<T>): Promise<T | null> {
  if (isServer && !isBuildTime) {
    return await importFn()
  }
  return null
}

// Ensure code runs only in API routes
export function apiRouteOnly<T>(fn: () => T): T {
  if (isServer && !isBuildTime) {
    return fn()
  }
  throw new Error('This code can only run in API routes')
}