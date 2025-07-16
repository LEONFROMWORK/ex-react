#!/usr/bin/env node
import { prisma } from '../src/lib/prisma'

/**
 * Migration script to update existing data for vertical slice architecture
 * This adds tenant support to existing records
 */

async function migrateAIModelConfigs() {
  console.log('🔄 Migrating AI Model Configurations...')
  
  // Add default tenant to existing models
  const modelsWithoutTenant = await prisma.aIModelConfig.findMany({
    where: {
      tenantId: ''
    }
  })

  console.log(`Found ${modelsWithoutTenant.length} models without tenant`)

  for (const model of modelsWithoutTenant) {
    await prisma.aIModelConfig.update({
      where: { id: model.id },
      data: { 
        tenantId: 'default'
      }
    })
  }

  console.log('✅ AI Model Configurations migrated')
}

async function migrateUsersWithTenant() {
  console.log('🔄 Migrating Users with Tenant...')
  
  // Add default tenant to existing users
  const users = await prisma.user.findMany({
    where: {
      tenantId: ''
    }
  })

  console.log(`Found ${users.length} users without tenant`)

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        tenantId: 'default'
      }
    })
  }

  console.log('✅ Users migrated with tenant')
}

async function createDefaultRoutingPolicy() {
  console.log('🔄 Creating default routing policy...')
  
  const existingPolicy = await prisma.aIModelPolicy.findFirst({
    where: { name: 'routing-config' }
  })

  if (!existingPolicy) {
    await prisma.aIModelPolicy.create({
      data: {
        name: 'routing-config',
        description: 'Default AI Model Routing Configuration',
        selectionMode: 'automatic',
        rules: {
          enableFallback: true,
          enableLoadBalancing: false,
          enableCostOptimization: true,
          enableLatencyOptimization: false,
          maxRetries: 3,
          timeoutMs: 30000,
          fallbackStrategy: 'similar-capability',
          costThreshold: 0.1,
          latencyThreshold: 5000,
          providerPriority: ['openrouter', 'openai', 'claude', 'gemini'],
          blacklistedModels: [],
          monitoring: {
            enableMetrics: true,
            alertOnFailure: true,
            alertThreshold: 5
          }
        },
        isActive: true,
        tenantId: 'default'
      }
    })
    console.log('✅ Default routing policy created')
  } else {
    console.log('ℹ️  Routing policy already exists')
  }
}

async function main() {
  console.log('🚀 Starting migration to Vertical Slice Architecture...\n')

  try {
    await migrateAIModelConfigs()
    await migrateUsersWithTenant()
    await createDefaultRoutingPolicy()

    console.log('\n✅ Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Update your API routes to use route.v2.ts files')
    console.log('2. Test the new endpoints with tenant context')
    console.log('3. Remove old singleton-based code once verified')
    console.log('4. Update environment variables if needed')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
main().catch(console.error)