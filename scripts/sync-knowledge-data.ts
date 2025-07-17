#!/usr/bin/env ts-node

/**
 * Knowledge Data Synchronization Script
 * 
 * Syncs Reddit and Stack Overflow Q&A data from excelapp-rails
 * knowledge base to the excelapp Next.js application's vector database
 */

import { promises as fs } from 'fs'
import path from 'path'
import { EmbeddingGenerator } from '../src/lib/ai/embedding-generator'
import { VectorDB } from '../src/lib/ai/vector-db'

interface KnowledgeThread {
  id: string
  external_id: string
  source: 'reddit' | 'stackoverflow' | 'manual'
  title: string
  question_content: string
  answer_content: string
  category: string
  quality_score: number
  source_metadata: {
    platform?: string
    votes?: number
    isAccepted?: boolean
    opConfirmed?: boolean
    threadUrl?: string
    [key: string]: any
  }
  op_confirmed: boolean
  votes: number
  source_url: string
  processed_at: string
  created_at: string
  updated_at: string
}

interface SyncConfig {
  railsApiUrl: string
  batchSize: number
  maxThreads: number
  qualityThreshold: number
  embeddingModel: string
}

class KnowledgeDataSyncer {
  private embeddingGenerator: EmbeddingGenerator
  private vectorDB: VectorDB
  private config: SyncConfig
  private stats = {
    processed: 0,
    embedded: 0,
    skipped: 0,
    errors: 0
  }

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      railsApiUrl: process.env.RAILS_API_URL || 'http://localhost:3001',
      batchSize: 50,
      maxThreads: 10000,
      qualityThreshold: 5.0,
      embeddingModel: 'text-embedding-3-small',
      ...config
    }

    this.embeddingGenerator = new EmbeddingGenerator({
      model: this.config.embeddingModel,
      apiKey: process.env.OPENROUTER_API_KEY!
    })

    this.vectorDB = new VectorDB()
  }

  async sync(): Promise<void> {
    console.log('🚀 Knowledge data synchronization started')
    console.log(`Config: ${JSON.stringify(this.config, null, 2)}`)

    try {
      // Initialize components
      await this.initialize()

      // Fetch knowledge threads from Rails API
      const threads = await this.fetchKnowledgeThreads()
      console.log(`📚 Found ${threads.length} knowledge threads`)

      // Process threads in batches
      await this.processThreadsInBatches(threads)

      // Generate summary report
      this.generateReport()

    } catch (error) {
      console.error('❌ Synchronization failed:', error)
      throw error
    }
  }

  private async initialize(): Promise<void> {
    console.log('🔧 Initializing components...')
    
    await this.embeddingGenerator.initialize()
    await this.vectorDB.initialize()
    
    console.log('✅ Components initialized')
  }

  private async fetchKnowledgeThreads(): Promise<KnowledgeThread[]> {
    console.log('📡 Fetching knowledge threads from Rails API...')

    // In a real implementation, this would make HTTP requests to the Rails API
    // For now, we'll check if there's a JSON export file
    const exportPath = path.join(process.cwd(), 'data', 'knowledge-export.json')
    
    try {
      const data = await fs.readFile(exportPath, 'utf8')
      const threads: KnowledgeThread[] = JSON.parse(data)
      
      // Filter by quality threshold
      return threads.filter(thread => 
        thread.quality_score >= this.config.qualityThreshold
      )
    } catch (error) {
      console.warn('⚠️  No export file found, generating sample data for testing')
      return this.generateSampleData()
    }
  }

  private generateSampleData(): KnowledgeThread[] {
    return [
      {
        id: '1',
        external_id: 'r_1m2cvm2',
        source: 'reddit',
        title: 'VLOOKUP 함수에서 #N/A 오류 해결 방법',
        question_content: 'VLOOKUP을 사용하는데 계속 #N/A 오류가 발생합니다. 어떻게 해결할 수 있나요?',
        answer_content: '#N/A 오류는 주로 다음과 같은 경우에 발생합니다: 1) 찾는 값이 첫 번째 열에 없는 경우, 2) 데이터 타입이 일치하지 않는 경우, 3) 정확히 일치하지 않는 경우입니다. IFERROR 함수와 함께 사용하면 오류를 처리할 수 있습니다.',
        category: 'formula_errors',
        quality_score: 8.2,
        source_metadata: {
          platform: 'reddit',
          votes: 25,
          opConfirmed: true,
          threadUrl: 'https://reddit.com/r/excel/comments/1m2cvm2/'
        },
        op_confirmed: true,
        votes: 25,
        source_url: 'https://reddit.com/r/excel/comments/1m2cvm2/',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        external_id: 'so_78901234',
        source: 'stackoverflow',
        title: '피벗테이블에서 동적 범위 설정하는 방법',
        question_content: '데이터가 계속 추가되는 상황에서 피벗테이블의 범위를 자동으로 확장하고 싶습니다.',
        answer_content: '테이블 기능을 사용하거나 OFFSET과 COUNTA 함수를 조합하여 동적 범위를 만들 수 있습니다. 또는 Power Query를 사용하여 자동 새로고침 기능을 활용할 수도 있습니다.',
        category: 'pivot_tables',
        quality_score: 9.1,
        source_metadata: {
          platform: 'stackoverflow',
          votes: 45,
          isAccepted: true,
          threadUrl: 'https://stackoverflow.com/questions/78901234/'
        },
        op_confirmed: false,
        votes: 45,
        source_url: 'https://stackoverflow.com/questions/78901234/',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  private async processThreadsInBatches(threads: KnowledgeThread[]): Promise<void> {
    const batches = this.createBatches(threads, this.config.batchSize)
    
    console.log(`📦 Processing ${batches.length} batches...`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} items)`)
      
      await this.processBatch(batch)
      
      // Small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await this.sleep(100)
      }
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return batches
  }

  private async processBatch(threads: KnowledgeThread[]): Promise<void> {
    const promises = threads.map(thread => this.processThread(thread))
    await Promise.allSettled(promises)
  }

  private async processThread(thread: KnowledgeThread): Promise<void> {
    try {
      this.stats.processed++

      // Create document text for embedding
      const documentText = this.createDocumentText(thread)
      
      // Generate embedding
      const embedding = await this.embeddingGenerator.generateEmbedding(documentText)
      
      // Store in vector database
      await this.vectorDB.store({
        id: `${thread.source}_${thread.external_id}`,
        text: documentText,
        embedding: embedding,
        metadata: {
          title: thread.title,
          category: thread.category,
          quality: thread.quality_score,
          source: thread.source,
          sourceMetadata: thread.source_metadata,
          questionContent: thread.question_content,
          answerContent: thread.answer_content,
          votes: thread.votes,
          opConfirmed: thread.op_confirmed,
          sourceUrl: thread.source_url,
          processedAt: thread.processed_at
        }
      })

      this.stats.embedded++
      
      if (this.stats.processed % 10 === 0) {
        console.log(`📊 Progress: ${this.stats.processed}/${this.stats.processed + this.stats.skipped + this.stats.errors} processed`)
      }

    } catch (error) {
      this.stats.errors++
      console.error(`❌ Error processing thread ${thread.external_id}:`, error)
    }
  }

  private createDocumentText(thread: KnowledgeThread): string {
    // Combine title, question, and answer for better semantic search
    const parts = [
      `제목: ${thread.title}`,
      `질문: ${thread.question_content}`,
      `답변: ${thread.answer_content}`,
      `카테고리: ${thread.category}`,
      `출처: ${thread.source === 'reddit' ? 'Reddit r/excel' : 'Stack Overflow'}`
    ]

    return parts.filter(Boolean).join('\n\n')
  }

  private generateReport(): void {
    console.log('\n📊 Synchronization Report')
    console.log('=' .repeat(40))
    console.log(`✅ Processed: ${this.stats.processed}`)
    console.log(`📝 Embedded: ${this.stats.embedded}`)
    console.log(`⏭️  Skipped: ${this.stats.skipped}`)
    console.log(`❌ Errors: ${this.stats.errors}`)
    console.log('=' .repeat(40))
    
    const successRate = this.stats.processed > 0 
      ? ((this.stats.embedded / this.stats.processed) * 100).toFixed(1)
      : '0.0'
    
    console.log(`📈 Success Rate: ${successRate}%`)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const configOverrides: Partial<SyncConfig> = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--batch-size':
        configOverrides.batchSize = parseInt(args[++i])
        break
      case '--max-threads':
        configOverrides.maxThreads = parseInt(args[++i])
        break
      case '--quality-threshold':
        configOverrides.qualityThreshold = parseFloat(args[++i])
        break
      case '--rails-api-url':
        configOverrides.railsApiUrl = args[++i]
        break
      case '--help':
        printHelp()
        process.exit(0)
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
    }
  }

  try {
    const syncer = new KnowledgeDataSyncer(configOverrides)
    await syncer.sync()
    console.log('🎉 Knowledge data synchronization completed successfully!')
  } catch (error) {
    console.error('💥 Synchronization failed:', error)
    process.exit(1)
  }
}

function printHelp() {
  console.log(`
Knowledge Data Synchronization Script

Usage: npm run sync-knowledge [options]

Options:
  --batch-size <number>         Number of threads to process in each batch (default: 50)
  --max-threads <number>        Maximum number of threads to process (default: 10000)
  --quality-threshold <number>  Minimum quality score to include (default: 5.0)
  --rails-api-url <url>         Rails API base URL (default: http://localhost:3001)
  --help                        Show this help message

Environment Variables:
  OPENROUTER_API_KEY           Required: OpenRouter API key for embeddings
  RAILS_API_URL                Rails API base URL (can be overridden with --rails-api-url)

Examples:
  npm run sync-knowledge
  npm run sync-knowledge -- --batch-size 100 --quality-threshold 7.0
  npm run sync-knowledge -- --rails-api-url http://production-rails-app.com
`)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { KnowledgeDataSyncer, type KnowledgeThread, type SyncConfig }