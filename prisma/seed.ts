import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  
  // Create test users
  const testUserPassword = await bcrypt.hash('password123', 10)
  
  const testUser = await prisma.user.upsert({
    where: { id: 'user-1' },
    update: {},
    create: {
      id: 'user-1',
      email: 'test@example.com',
      password: testUserPassword,
      name: 'Test User',
      role: 'USER',
      referralCode: 'TEST123',
      credits: 1000,
      emailVerified: new Date(),
    }
  })
  
  const adminUser = await prisma.user.upsert({
    where: { id: 'admin-1' },
    update: {},
    create: {
      id: 'admin-1',
      email: 'admin@example.com',
      password: testUserPassword,
      name: 'Admin User',
      role: 'ADMIN',
      referralCode: 'ADMIN123',
      credits: 10000,
      emailVerified: new Date(),
    }
  })
  
  console.log('✅ Created test users:', { testUser: testUser.email, adminUser: adminUser.email })
  
  // Create some sample AI model configurations
  const openRouterConfig = await prisma.aIModelConfig.upsert({
    where: { id: 'openrouter-default' },
    update: {},
    create: {
      id: 'openrouter-default',
      provider: 'openrouter',
      modelName: 'meta-llama/llama-2-70b-chat',
      displayName: 'LLAMA 2 70B (via OpenRouter)',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      isActive: true,
      isDefault: true,
      maxTokens: 2000,
      temperature: 0.7,
      costPerCredit: 0.0001,
      taskTypes: ['CREATE', 'CORRECT', 'ANALYZE'],
      complexity: ['simple', 'complex'],
      priority: 100,
      description: 'High performance model for Excel analysis and correction'
    }
  })
  
  console.log('✅ Created AI model config:', openRouterConfig.displayName)
  
  // Create default AI routing policy
  const routingPolicy = await prisma.aIModelPolicy.upsert({
    where: { 
      name_tenantId: {
        name: 'default-routing',
        tenantId: 'default'
      }
    },
    update: {},
    create: {
      name: 'default-routing',
      description: 'Default AI model routing policy',
      selectionMode: 'auto',
      rules: JSON.stringify({
        preferredProviders: ['openrouter'],
        fallbackChain: ['openrouter'],
        taskMapping: {
          CREATE: ['openrouter'],
          ANALYZE: ['openrouter'],
          CORRECT: ['openrouter']
        }
      }),
      isActive: true,
      tenantId: 'default'
    }
  })
  
  console.log('✅ Created routing policy:', routingPolicy.name)
  
  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })