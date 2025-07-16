// Repository Layer - Data Access
import { PrismaClient } from '@prisma/client'
import { IAnalysisResult } from '../types/excel-analysis.types'
import { nanoid } from 'nanoid'

export class ExcelAnalysisRepository {
  private prisma: PrismaClient
  
  constructor() {
    this.prisma = new PrismaClient()
  }
  
  async saveAnalysis(data: {
    userId: string
    results: any[]
    metadata: any
  }): Promise<IAnalysisResult> {
    const analysisId = nanoid()
    
    // 실제로는 Prisma를 사용하여 DB에 저장
    // 여기서는 간단한 예시
    const analysis = {
      id: analysisId,
      userId: data.userId,
      results: data.results,
      metadata: data.metadata,
      createdAt: new Date(),
      status: 'completed'
    }
    
    // In-memory storage for demo (실제로는 DB 사용)
    if (!global.analysisStorage) {
      global.analysisStorage = new Map()
    }
    global.analysisStorage.set(analysisId, analysis)
    
    return analysis as IAnalysisResult
  }
  
  async getAnalysisById(analysisId: string, userId?: string): Promise<IAnalysisResult | null> {
    const analysis = global.analysisStorage?.get(analysisId)
    
    if (!analysis) {
      return null
    }
    
    // 권한 체크
    if (userId && analysis.userId !== userId) {
      return null
    }
    
    return analysis
  }
  
  async getAnalysisHistory(userId: string, limit: number = 10): Promise<IAnalysisResult[]> {
    if (!global.analysisStorage) {
      return []
    }
    
    const userAnalyses = Array.from(global.analysisStorage.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
    
    return userAnalyses
  }
  
  async deleteAnalysis(analysisId: string, userId: string): Promise<boolean> {
    const analysis = await this.getAnalysisById(analysisId, userId)
    
    if (!analysis) {
      return false
    }
    
    global.analysisStorage?.delete(analysisId)
    return true
  }
  
  async updateAnalysisStatus(analysisId: string, status: string): Promise<void> {
    const analysis = global.analysisStorage?.get(analysisId)
    
    if (analysis) {
      analysis.status = status
      analysis.updatedAt = new Date()
    }
  }
  
  async ping(): Promise<boolean> {
    try {
      // DB 연결 확인
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }
  
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}