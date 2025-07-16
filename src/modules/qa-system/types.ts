// Q&A 시스템 타입 정의

export interface QADocument {
  id: string
  title: string
  content: string
  answer: string
  category: string
  tags: string[]
  source: string
  metadata?: Record<string, any>
}

export interface SearchResult {
  id: string
  title: string
  answer: string
  category: string
  similarity: number
  metadata?: Record<string, any>
}

export interface QASystemOptions {
  collectionName?: string
  embeddingModel?: string
  maxResults?: number
  minSimilarity?: number
}

export interface QuestionCategory {
  name: string
  keywords: string[]
  priority: number
}

export interface CrawledData {
  id: string
  title: string
  content: string
  best_answer: string
  category: string
  tags: string[]
  view_count: number
  source: string
  date: string
  url?: string
}