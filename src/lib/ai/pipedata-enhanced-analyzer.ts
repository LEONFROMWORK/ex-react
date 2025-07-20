import { AIModelManager } from './model-manager'
import { PipeDataIntegrationService } from '@/lib/services/pipedata-integration.service'
import { ModelSelectionCriteria } from './types'

export class PipeDataEnhancedAnalyzer {
  private aiManager: AIModelManager
  private pipeDataService: PipeDataIntegrationService

  constructor() {
    this.aiManager = AIModelManager.getInstance()
    this.pipeDataService = new PipeDataIntegrationService()
  }

  /**
   * PipeData 지식을 활용한 Excel 분석
   */
  async analyzeExcel(query: string, fileContext?: any) {
    try {
      // 1. PipeData 지식 검색
      const knowledge = await this.pipeDataService.analyzeWithPipeDataKnowledge(query)

      // 2. 강화된 프롬프트 생성
      const enhancedPrompt = this.buildEnhancedPrompt(query, knowledge, fileContext)

      // 3. AI 모델 선택 기준
      const criteria: ModelSelectionCriteria = {
        taskType: 'EXCEL_ANALYSIS',
        complexity: knowledge.difficulty,
        userPreference: undefined,
        costLimit: knowledge.difficulty === 'advanced' ? undefined : 0.01
      }

      // 4. AI 응답 생성
      const aiResponse = await this.aiManager.chat(enhancedPrompt, criteria, {
        maxTokens: knowledge.difficulty === 'advanced' ? 2000 : 1000,
        temperature: 0.7
      })

      // 5. 결과 통합
      return {
        analysis: aiResponse.content,
        confidence: this.calculateConfidence(knowledge.similarCases),
        similarCases: knowledge.similarCases.slice(0, 3),
        modelUsed: aiResponse.model,
        cost: aiResponse.cost,
        metadata: {
          difficulty: knowledge.difficulty,
          usedPipeDataKnowledge: knowledge.similarCases.length > 0,
          recommendedTier: knowledge.recommendedTier
        }
      }
    } catch (error) {
      console.error('PipeData enhanced analysis error:', error)
      throw error
    }
  }

  /**
   * 강화된 프롬프트 생성
   */
  private buildEnhancedPrompt(
    query: string, 
    knowledge: any, 
    fileContext?: any
  ): string {
    let prompt = `당신은 Excel 전문가 AI 어시스턴트입니다.\n\n`

    // PipeData 지식 추가
    if (knowledge.context) {
      prompt += `참고할 수 있는 유사한 사례:\n${knowledge.context}\n\n`
    }

    // 파일 컨텍스트 추가
    if (fileContext) {
      prompt += `현재 Excel 파일 정보:\n`
      prompt += `- 파일명: ${fileContext.fileName}\n`
      prompt += `- 크기: ${fileContext.fileSize}\n`
      if (fileContext.errors) {
        prompt += `- 발견된 오류: ${fileContext.errors.length}개\n`
      }
      prompt += '\n'
    }

    // 사용자 질문
    prompt += `사용자 질문: ${query}\n\n`

    // 지시사항
    prompt += `위의 참고 사례를 바탕으로 정확하고 실용적인 답변을 제공해주세요.`
    
    if (knowledge.difficulty === 'advanced') {
      prompt += ` 고급 기능과 최적화 방법도 포함해주세요.`
    }

    return prompt
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(similarCases: any[]): number {
    if (similarCases.length === 0) return 0.5

    // 유사도와 품질 점수를 기반으로 신뢰도 계산
    const avgSimilarity = similarCases.reduce((sum, case_) => 
      sum + (case_.similarity || 0), 0
    ) / similarCases.length

    const avgQuality = similarCases.reduce((sum, case_) => 
      sum + (case_.quality_score || 7), 0
    ) / similarCases.length

    // 가중 평균 (유사도 70%, 품질 30%)
    const confidence = (avgSimilarity * 0.7) + (avgQuality / 10 * 0.3)

    return Math.min(Math.max(confidence, 0), 1)
  }

  /**
   * Excel 오류 수정 제안
   */
  async suggestCorrections(errors: any[]) {
    const suggestions = []

    for (const error of errors) {
      // 각 오류에 대해 PipeData 지식 검색
      const knowledge = await this.pipeDataService.analyzeWithPipeDataKnowledge(
        `Excel ${error.type} 오류: ${error.message}`
      )

      if (knowledge.similarCases.length > 0) {
        suggestions.push({
          error,
          suggestion: knowledge.similarCases[0].answer,
          confidence: knowledge.similarCases[0].similarity,
          source: 'pipedata'
        })
      }
    }

    return suggestions
  }
}