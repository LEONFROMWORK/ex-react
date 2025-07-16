// Centralized environment variable management
// This ensures environment variables are properly typed and validated

export const getEnvVar = (key: string, defaultValue?: string): string => {
  // During build time, return default values to prevent errors
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env[key]) {
    return defaultValue || ''
  }
  
  return process.env[key] || defaultValue || ''
}

export const env = {
  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL', ''),
  
  // Auth
  NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL', 'http://localhost:3000'),
  NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET', 'dev-secret'),
  
  // OpenAI
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY', ''),
  
  // Google
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnvVar('GOOGLE_CLIENT_SECRET', ''),
  
  // GitHub
  GITHUB_CLIENT_ID: getEnvVar('GITHUB_CLIENT_ID', ''),
  GITHUB_CLIENT_SECRET: getEnvVar('GITHUB_CLIENT_SECRET', ''),
  
  // Email
  EMAIL_HOST: getEnvVar('EMAIL_HOST', 'smtp.gmail.com'),
  EMAIL_PORT: getEnvVar('EMAIL_PORT', '587'),
  EMAIL_USER: getEnvVar('EMAIL_USER', ''),
  EMAIL_PASS: getEnvVar('EMAIL_PASS', ''),
  EMAIL_FROM: getEnvVar('EMAIL_FROM', 'noreply@exhell.com'),
  
  // Redis
  REDIS_URL: getEnvVar('REDIS_URL', ''),
  
  // AWS
  AWS_ACCESS_KEY_ID: getEnvVar('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: getEnvVar('AWS_SECRET_ACCESS_KEY', ''),
  AWS_REGION: getEnvVar('AWS_REGION', 'us-east-1'),
  AWS_S3_BUCKET: getEnvVar('AWS_S3_BUCKET', ''),
  
  // Application
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvVar('PORT', '3000'),
  
  // Feature flags
  ENABLE_REDIS: getEnvVar('ENABLE_REDIS', 'false') === 'true',
  ENABLE_S3: getEnvVar('ENABLE_S3', 'false') === 'true',
  
  // API Keys
  RAPID_API_KEY: getEnvVar('RAPID_API_KEY', ''),
  MOCK_AI: getEnvVar('MOCK_AI', 'false') === 'true',
}

// Type-safe environment variable access
export type Env = typeof env