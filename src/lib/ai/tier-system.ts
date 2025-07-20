/**
 * 3-Tier AI Analysis System
 * Cost-optimized AI routing for Excel analysis
 */

import { OpenRouterProvider } from './providers/openrouter'
import { AIResponse, AIOptions } from './types'

export interface TierConfig {
  model: string
  costPerToken: number
  purpose: string
  confidenceThreshold: number
  responseTimeTarget: number // seconds
}

export interface TierAnalysisResult {
  tier: number
  response: AIResponse
  confidence: number
  escalationReason?: string
  totalCost: number
}

export class TierSystemManager {
  private tiers: TierConfig[] = [
    {
      model: 'deepseek/deepseek-chat',
      costPerToken: 0.0001,
      purpose: '빠른 응답, 기본 문제 해결',
      confidenceThreshold: 0.85,
      responseTimeTarget: 5
    },
    {
      model: 'openai/gpt-3.5-turbo', 
      costPerToken: 0.0015,
      purpose: '복잡한 문제, 균형잡힌 성능',
      confidenceThreshold: 0.90,
      responseTimeTarget: 15
    },
    {
      model: 'openai/gpt-4-turbo',
      costPerToken: 0.01,
      purpose: '최고 난이도 문제, 최종 해결책',
      confidenceThreshold: 0.95,
      responseTimeTarget: 30
    }
  ]

  constructor(private apiKey: string) {}

  async analyzeWithTiers(
    prompt: string,
    options: AIOptions = {},
    maxTier: number = 3
  ): Promise<TierAnalysisResult> {
    let totalCost = 0
    let lastResponse: AIResponse | null = null
    
    for (let tierIndex = 0; tierIndex < Math.min(maxTier, this.tiers.length); tierIndex++) {
      const tier = this.tiers[tierIndex]
      const provider = new OpenRouterProvider(this.apiKey, tier.model)
      
      console.log(`🤖 Tier ${tierIndex + 1} 분석 시작: ${tier.model}`)
      
      try {
        // Add tier-specific system prompt
        const tierPrompt = this.buildTierPrompt(prompt, tierIndex + 1, options.systemPrompt)
        const tierOptions = {
          ...options,
          systemPrompt: tierPrompt
        }
        
        const response = await provider.generateResponse(prompt, tierOptions)
        lastResponse = response
        totalCost += response.cost || 0
        
        // Extract confidence from response
        const confidence = this.extractConfidence(response.content)
        
        console.log(`📊 Tier ${tierIndex + 1} 신뢰도: ${confidence}`)
        
        // Check if confidence meets threshold
        if (confidence >= tier.confidenceThreshold || tierIndex === this.tiers.length - 1) {
          return {
            tier: tierIndex + 1,
            response,
            confidence,
            totalCost
          }
        }
        
        // Log escalation reason
        const escalationReason = `Tier ${tierIndex + 1} 신뢰도 ${confidence} < ${tier.confidenceThreshold}`
        console.log(`⬆️ 에스컬레이션: ${escalationReason}`)
        
        if (tierIndex === maxTier - 1) {
          return {
            tier: tierIndex + 1,
            response,
            confidence,
            escalationReason,
            totalCost
          }
        }
        
      } catch (error) {
        console.error(`❌ Tier ${tierIndex + 1} 오류:`, error)
        
        // If this is the last tier, throw the error
        if (tierIndex === maxTier - 1 || tierIndex === this.tiers.length - 1) {
          throw error
        }
        
        // Otherwise, escalate to next tier
        continue
      }
    }
    
    // Fallback (should not reach here)
    throw new Error('모든 AI Tier에서 분석 실패')
  }

  private buildTierPrompt(prompt: string, tier: number, existingSystemPrompt?: string): string {
    const tierInstructions = {
      1: `당신은 빠르고 효율적인 Excel 분석 전문가입니다. 
           기본적인 오류를 신속하게 탐지하고 해결책을 제시하세요.
           응답 마지막에 신뢰도를 "신뢰도: 0.XX" 형식으로 표시하세요.`,
      
      2: `당신은 복잡한 Excel 문제를 해결하는 전문가입니다.
           Tier 1에서 해결되지 않은 복잡한 문제를 분석하고 있습니다.
           더 정교한 분석과 다양한 해결 방안을 제시하세요.
           응답 마지막에 신뢰도를 "신뢰도: 0.XX" 형식으로 표시하세요.`,
      
      3: `당신은 최고 수준의 Excel 분석 전문가입니다.
           가장 복잡하고 까다로운 문제를 해결하고 있습니다.
           모든 가능성을 검토하고 최적의 해결책을 제시하세요.
           응답 마지막에 신뢰도를 "신뢰도: 0.XX" 형식으로 표시하세요.`
    }
    
    const tierPrompt = tierInstructions[tier as keyof typeof tierInstructions] || tierInstructions[1]
    
    return existingSystemPrompt 
      ? `${existingSystemPrompt}\n\n${tierPrompt}`
      : tierPrompt
  }

  private extractConfidence(content: string): number {
    // Extract confidence from response content
    const confidenceMatch = content.match(/신뢰도:\s*(\d*\.?\d+)/i)
    
    if (confidenceMatch) {
      const confidence = parseFloat(confidenceMatch[1])
      return Math.min(Math.max(confidence, 0), 1) // Clamp between 0 and 1
    }
    
    // Fallback: analyze response quality
    return this.estimateConfidence(content)
  }

  private estimateConfidence(content: string): number {
    // Heuristic confidence estimation based on response characteristics
    let confidence = 0.5 // base confidence
    
    // Longer, more detailed responses tend to be more confident
    if (content.length > 500) confidence += 0.1
    if (content.length > 1000) confidence += 0.1
    
    // Presence of specific Excel terms
    const excelTerms = ['수식', '셀', '범위', '함수', 'VLOOKUP', 'INDEX', 'MATCH', 'IF', 'SUM']
    const termMatches = excelTerms.filter(term => content.includes(term)).length
    confidence += (termMatches / excelTerms.length) * 0.2
    
    // Code blocks or formulas suggest detailed analysis
    if (content.includes('```') || content.includes('=')) confidence += 0.1
    
    // Multiple solution approaches
    if (content.includes('방법') || content.includes('대안')) confidence += 0.1
    
    return Math.min(confidence, 0.8) // Cap at 0.8 for heuristic estimates
  }

  getTierInfo(): TierConfig[] {
    return this.tiers
  }

  estimateCostByTier(tokens: number): Record<number, number> {
    return this.tiers.reduce((costs, tier, index) => {
      costs[index + 1] = tokens * tier.costPerToken / 1000
      return costs
    }, {} as Record<number, number>)
  }
}

// Usage example:
export async function analyzeExcelWithTiers(
  prompt: string,
  apiKey: string,
  options: AIOptions = {}
): Promise<TierAnalysisResult> {
  const tierSystem = new TierSystemManager(apiKey)
  return await tierSystem.analyzeWithTiers(prompt, options)
}