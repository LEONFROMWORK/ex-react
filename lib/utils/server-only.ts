// Server-only utilities
export const isServer = typeof window === 'undefined';
export const isBuildTime = process.env.NODE_ENV === 'production' && isServer;