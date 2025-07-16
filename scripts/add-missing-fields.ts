// This script adds missing fields to the database schema
// Run with: npx ts-node scripts/add-missing-fields.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding missing fields to database schema...')

  try {
    // Add tenantId to ChatConversation if missing
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ChatConversation" 
      ADD COLUMN IF NOT EXISTS "tenantId" TEXT DEFAULT 'default'
    `).catch(() => {
      console.log('tenantId field already exists in ChatConversation')
    })

    // Add modelUsed to ChatMessage if missing
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ChatMessage" 
      ADD COLUMN IF NOT EXISTS "modelUsed" TEXT
    `).catch(() => {
      console.log('modelUsed field already exists in ChatMessage')
    })

    console.log('✅ Database schema updated successfully')
  } catch (error) {
    console.error('Error updating database schema:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()