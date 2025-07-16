import Redis from "ioredis"

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL
  }
  return null
}

const redisUrl = getRedisUrl()

export const redis = redisUrl
  ? new Redis(redisUrl)
  : {
      // Mock Redis client for local development without Redis
      get: async () => null,
      set: async () => "OK",
      del: async () => 1,
      expire: async () => 1,
      ttl: async () => -1,
      ping: async () => "PONG",
      setex: async () => "OK",
      exists: async () => 0,
      incr: async () => 1,
      decr: async () => 0,
      hget: async () => null,
      hset: async () => 1,
      hdel: async () => 1,
      hgetall: async () => ({}),
      keys: async () => [],
      flushdb: async () => "OK",
    }