/**
 * Central Configuration Module
 * 환경별 설정을 중앙에서 관리
 */

export type Environment = 'development' | 'test' | 'production'
export type CacheProvider = 'redis' | 'memory'
export type StorageProvider = 'local' | 's3' | 'azure'
export type EmailProvider = 'mock' | 'sendgrid' | 'smtp'
export type PaymentProvider = 'mock' | 'toss' | 'stripe'

interface DatabaseConfig {
  url: string
  usePostgres: boolean
  useSqlite: boolean
}

interface CacheConfig {
  provider: CacheProvider
  redis: {
    url?: string
    password?: string
    enabled: boolean
  }
}

interface AIConfig {
  useMock: boolean
  providers: {
    openai?: string
    anthropic?: string
    google?: string
    openrouter?: string
  }
  models: {
    tier1: string
    tier2: string
  }
  settings: {
    confidenceThreshold: number
    maxTokensPerRequest: number
    cacheTTL: number
  }
}

interface StorageConfig {
  provider: StorageProvider
  local: {
    uploadDir: string
  }
  s3: {
    bucket?: string
    region?: string
    accessKeyId?: string
    secretAccessKey?: string
  }
  azure: {
    connectionString?: string
    containerName?: string
  }
}

interface EmailConfig {
  provider: EmailProvider
  from: string
  mock: {
    enabled: boolean
  }
  sendgrid: {
    apiKey?: string
  }
  smtp: {
    host?: string
    port?: number
    secure?: boolean
    user?: string
    pass?: string
  }
}

interface AuthConfig {
  secret: string
  url: string
  mockEnabled: boolean
  google: {
    clientId?: string
    clientSecret?: string
  }
}

interface PaymentConfig {
  provider: PaymentProvider
  toss: {
    clientKey?: string
    secretKey?: string
    webhookSecret?: string
  }
}

interface FeatureFlags {
  vbaProcessing: boolean
  websocket: boolean
  cacheWarming: boolean
}

interface ApplicationConfig {
  url: string
  logLevel: string
  encryptionKey?: string
  rateLimit: {
    windowMs: number
    maxRequests: number
  }
}

interface MonitoringConfig {
  enabled: boolean
  sentryDsn?: string
}

export interface Config {
  env: Environment
  database: DatabaseConfig
  cache: CacheConfig
  ai: AIConfig
  storage: StorageConfig
  email: EmailConfig
  auth: AuthConfig
  payment: PaymentConfig
  features: FeatureFlags
  app: ApplicationConfig
  monitoring: MonitoringConfig
}

// Helper function to get environment variable with fallback
const getEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue
}

const getBoolEnv = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key]
  if (value === undefined) return defaultValue
  return value === 'true'
}

const getNumberEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key]
  if (!value) return defaultValue
  const num = parseInt(value, 10)
  return isNaN(num) ? defaultValue : num
}

// Determine current environment
const currentEnv = (getEnv('APP_ENV', getEnv('NODE_ENV', 'development')) as Environment)

// Build configuration object
export const config: Config = {
  env: currentEnv,
  
  database: {
    url: getEnv('DATABASE_URL', 'file:./dev.db'),
    usePostgres: currentEnv === 'production' || getEnv('DATABASE_URL', '').startsWith('postgresql://'),
    useSqlite: currentEnv !== 'production' && getEnv('DATABASE_URL', '').startsWith('file:')
  },
  
  cache: {
    provider: getEnv('CACHE_PROVIDER', 'memory') as CacheProvider,
    redis: {
      url: getEnv('REDIS_URL'),
      password: getEnv('REDIS_PASSWORD'),
      enabled: getEnv('CACHE_PROVIDER') === 'redis' && !getBoolEnv('DISABLE_REDIS')
    }
  },
  
  ai: {
    useMock: getBoolEnv('USE_MOCK_AI'),
    providers: {
      openai: getEnv('OPENAI_API_KEY'),
      anthropic: getEnv('ANTHROPIC_API_KEY'),
      google: getEnv('GOOGLE_AI_API_KEY'),
      openrouter: getEnv('OPENROUTER_API_KEY')
    },
    models: {
      tier1: getEnv('AI_TIER1_MODEL', 'gpt-3.5-turbo'),
      tier2: getEnv('AI_TIER2_MODEL', 'gpt-4')
    },
    settings: {
      confidenceThreshold: parseFloat(getEnv('AI_CONFIDENCE_THRESHOLD', '0.85')),
      maxTokensPerRequest: getNumberEnv('AI_MAX_TOKENS_PER_REQUEST', 4000),
      cacheTTL: getNumberEnv('AI_CACHE_TTL', 3600)
    }
  },
  
  storage: {
    provider: getEnv('STORAGE_PROVIDER', 'local') as StorageProvider,
    local: {
      uploadDir: getEnv('UPLOAD_DIR', './uploads')
    },
    s3: {
      bucket: getEnv('S3_BUCKET_NAME', getEnv('AWS_S3_BUCKET')),
      region: getEnv('AWS_REGION', 'us-east-1'),
      accessKeyId: getEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY')
    },
    azure: {
      connectionString: getEnv('AZURE_STORAGE_CONNECTION'),
      containerName: getEnv('AZURE_CONTAINER_NAME', 'excel-files')
    }
  },
  
  email: {
    provider: getEnv('EMAIL_PROVIDER', 'mock') as EmailProvider,
    from: getEnv('EMAIL_FROM', 'noreply@exhell.com'),
    mock: {
      enabled: getEnv('EMAIL_PROVIDER') === 'mock'
    },
    sendgrid: {
      apiKey: getEnv('SENDGRID_API_KEY')
    },
    smtp: {
      host: getEnv('EMAIL_SERVER_HOST', getEnv('SMTP_HOST')),
      port: getNumberEnv('EMAIL_SERVER_PORT', getNumberEnv('SMTP_PORT', 587)),
      secure: getBoolEnv('SMTP_SECURE'),
      user: getEnv('EMAIL_SERVER_USER', getEnv('SMTP_USER')),
      pass: getEnv('EMAIL_SERVER_PASSWORD', getEnv('SMTP_PASS'))
    }
  },
  
  auth: {
    secret: getEnv('AUTH_SECRET', getEnv('NEXTAUTH_SECRET', 'dev-secret')),
    url: getEnv('NEXTAUTH_URL', 'http://localhost:3000'),
    mockEnabled: getBoolEnv('MOCK_AUTH_ENABLED'),
    google: {
      clientId: getEnv('GOOGLE_CLIENT_ID'),
      clientSecret: getEnv('GOOGLE_CLIENT_SECRET')
    }
  },
  
  payment: {
    provider: getEnv('PAYMENT_PROVIDER', 'mock') as PaymentProvider,
    toss: {
      clientKey: getEnv('TOSS_CLIENT_KEY', getEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY')),
      secretKey: getEnv('TOSS_SECRET_KEY'),
      webhookSecret: getEnv('TOSS_WEBHOOK_SECRET')
    }
  },
  
  features: {
    vbaProcessing: getBoolEnv('ENABLE_VBA_PROCESSING', true),
    websocket: getBoolEnv('ENABLE_WEBSOCKET'),
    cacheWarming: getBoolEnv('ENABLE_CACHE_WARMING')
  },
  
  app: {
    url: getEnv('APP_URL', getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')),
    logLevel: getEnv('LOG_LEVEL', 'info'),
    encryptionKey: getEnv('ENCRYPTION_KEY'),
    rateLimit: {
      windowMs: getNumberEnv('RATE_LIMIT_WINDOW_MS', 60000),
      maxRequests: getNumberEnv('RATE_LIMIT_MAX_REQUESTS', 60)
    }
  },
  
  monitoring: {
    enabled: getBoolEnv('ENABLE_MONITORING'),
    sentryDsn: getEnv('SENTRY_DSN')
  }
}

// Environment-specific validation
export const validateConfig = (): void => {
  const errors: string[] = []
  
  // Production-specific validations
  if (config.env === 'production') {
    if (!config.auth.secret || config.auth.secret === 'dev-secret') {
      errors.push('AUTH_SECRET must be set in production')
    }
    
    if (config.database.useSqlite) {
      errors.push('SQLite should not be used in production')
    }
    
    if (config.ai.useMock) {
      errors.push('Mock AI should not be used in production')
    }
    
    if (config.email.provider === 'mock') {
      errors.push('Mock email provider should not be used in production')
    }
  }
  
  // Test-specific validations
  if (config.env === 'test') {
    if (!config.ai.useMock) {
      console.warn('Warning: Using real AI services in test environment')
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
  }
}

// Export helper functions
export const isDevelopment = () => config.env === 'development'
export const isTest = () => config.env === 'test'
export const isProduction = () => config.env === 'production'

// Export config for debugging (only in development)
if (isDevelopment()) {
  console.log('Current configuration:', JSON.stringify(config, null, 2))
}