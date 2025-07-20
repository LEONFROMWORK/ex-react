/**
 * Gemini 1.5 Flash Vision AI Service Implementation
 * 멀티모달 이미지 분석을 위한 Google Gemini API 연동
 */

import { Result } from '@/Common/Result'
import { IVisionAIService } from '../ImageBasedExplanation'
import type {
  ImageAttachment,
  AnalysisContext,
  VisionAnalysisResult,
  DetectedElement,
  IdentifiedPattern
} from '../ImageBasedExplanation'

export interface GeminiConfig {
  apiKey: string
  model: string
  baseUrl?: string
  maxRetries?: number
  timeout?: number
}

export interface GeminiVisionRequest {
  contents: Array<{
    parts: Array<{
      text?: string
      inline_data?: {
        mime_type: string
        data: string
      }
    }>
  }>
  generationConfig: {
    temperature: number
    topK: number
    topP: number
    maxOutputTokens: number
  }
  safetySettings: Array<{
    category: string
    threshold: string
  }>
}

export interface GeminiVisionResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    finishReason: string
    safetyRatings: Array<{
      category: string
      probability: string
    }>
  }>
  usageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export class GeminiVisionAIService implements IVisionAIService {
  private config: GeminiConfig
  private baseUrl: string

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-1.5-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      maxRetries: 3,
      timeout: 30000,
      ...config
    }
    this.baseUrl = `${this.config.baseUrl}/models/${this.config.model}:generateContent`
  }

  async analyzeImage(
    image: ImageAttachment,
    context: AnalysisContext
  ): Promise<Result<VisionAnalysisResult>> {
    try {
      const prompt = this.buildAnalysisPrompt(context, false)
      const request = this.buildGeminiRequest([image], prompt, context)
      
      const response = await this.callGeminiAPI(request)
      if (!response.isSuccess) {
        return Result.failure(response.error)
      }

      const analysis = this.parseGeminiResponse(response.value, image.id)
      return Result.success(analysis)

    } catch (error) {
      return Result.failure({
        code: 'GEMINI_ANALYSIS_FAILED',
        message: `Gemini 이미지 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      })
    }
  }

  async analyzeMultipleImages(
    images: ImageAttachment[],
    context: AnalysisContext
  ): Promise<Result<VisionAnalysisResult[]>> {
    try {
      const prompt = this.buildAnalysisPrompt(context, true)
      const request = this.buildGeminiRequest(images, prompt, context)
      
      const response = await this.callGeminiAPI(request)
      if (!response.isSuccess) {
        return Result.failure(response.error)
      }

      const analyses = this.parseMultipleImagesResponse(response.value, images)
      return Result.success(analyses)

    } catch (error) {
      return Result.failure({
        code: 'GEMINI_MULTI_ANALYSIS_FAILED',
        message: `Gemini 다중 이미지 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      })
    }
  }

  private buildAnalysisPrompt(context: AnalysisContext, isMultiple: boolean): string {
    const focusDescription = this.getFocusDescription(context.focusAreas)
    const imageCount = isMultiple ? '여러 장의 이미지' : '이미지'
    
    return `
당신은 Excel 파일 분석 전문가입니다. ${imageCount}를 분석하여 Excel 구현에 필요한 정보를 추출해주세요.

**분석 유형**: ${context.analysisType}
**집중 영역**: ${focusDescription}
**도메인**: ${context.domain}

**분석 요구사항**:
1. 이미지에서 발견되는 모든 요소들을 상세히 식별
2. Excel에서 구현 가능한 패턴과 구조 파악
3. 기술적 요구사항과 구현 난이도 평가
4. 각 요소의 위치와 관계성 분석

**응답 형식** (JSON):
\`\`\`json
{
  "detectedElements": [
    {
      "type": "chart|table|form|diagram|ui_mockup|workflow|other",
      "description": "요소에 대한 상세 설명",
      "location": {
        "x": 0,
        "y": 0,
        "width": 100,
        "height": 100
      },
      "confidence": 0.95,
      "relatedExcelFeatures": ["기능1", "기능2"]
    }
  ],
  "identifiedPatterns": [
    {
      "patternType": "data_structure|calculation_flow|ui_layout|business_logic",
      "description": "패턴 설명",
      "complexityLevel": "simple|moderate|complex|expert",
      "implementationApproach": ["접근법1", "접근법2"]
    }
  ],
  "technicalRequirements": ["요구사항1", "요구사항2"],
  "confidenceScore": 0.85,
  "processingTime": 1500
}
\`\`\`

이미지를 자세히 분석하고 위 형식으로 응답해주세요.
    `.trim()
  }

  private getFocusDescription(focusAreas: string[]): string {
    const descriptions: Record<string, string> = {
      'data_structure': '데이터 구조와 테이블 레이아웃',
      'table_layout': '표 구성과 열/행 관계',
      'column_relationships': '컬럼 간의 관계성',
      'hierarchy': '계층적 구조',
      'formulas': '수식과 계산 로직',
      'calculations': '계산 과정',
      'business_logic': '비즈니스 로직',
      'data_flow': '데이터 흐름',
      'optimization_opportunities': '최적화 기회',
      'best_practices': '모범 사례',
      'efficiency_gains': '효율성 개선',
      'error_identification': '오류 식별',
      'problem_areas': '문제 영역',
      'debugging_hints': '디버깅 힌트',
      'general_analysis': '일반적인 분석'
    }

    return focusAreas
      .map(area => descriptions[area] || area)
      .join(', ')
  }

  private buildGeminiRequest(
    images: ImageAttachment[],
    prompt: string,
    context: AnalysisContext
  ): GeminiVisionRequest {
    const parts = [
      { text: prompt },
      ...images.map(image => ({
        inline_data: {
          mime_type: image.mimeType,
          data: image.base64Data.replace(/^data:[^;]+;base64,/, '')
        }
      }))
    ]

    return {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2, // Low temperature for consistent analysis
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 4096
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    }
  }

  private async callGeminiAPI(
    request: GeminiVisionRequest,
    retryCount = 0
  ): Promise<Result<GeminiVisionResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout!)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Gemini API 오류 (${response.status}): ${JSON.stringify(errorData)}`)
      }

      const data: GeminiVisionResponse = await response.json()
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Gemini API에서 응답 후보를 받지 못했습니다')
      }

      return Result.success(data)

    } catch (error) {
      if (retryCount < this.config.maxRetries!) {
        console.warn(`Gemini API 호출 실패, 재시도 중... (${retryCount + 1}/${this.config.maxRetries})`)
        await this.delay(Math.pow(2, retryCount) * 1000) // Exponential backoff
        return this.callGeminiAPI(request, retryCount + 1)
      }

      return Result.failure({
        code: 'GEMINI_API_CALL_FAILED',
        message: `Gemini API 호출 최종 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      })
    }
  }

  private parseGeminiResponse(
    response: GeminiVisionResponse,
    imageId: string
  ): VisionAnalysisResult {
    const candidate = response.candidates[0]
    const text = candidate.content.parts[0]?.text || ''
    
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
      if (!jsonMatch) {
        throw new Error('JSON 형식의 응답을 찾을 수 없습니다')
      }

      const analysisData = JSON.parse(jsonMatch[1])
      
      return {
        imageId,
        detectedElements: this.validateDetectedElements(analysisData.detectedElements || []),
        identifiedPatterns: this.validateIdentifiedPatterns(analysisData.identifiedPatterns || []),
        technicalRequirements: analysisData.technicalRequirements || [],
        confidenceScore: Math.min(Math.max(analysisData.confidenceScore || 0.7, 0), 1),
        processingTime: analysisData.processingTime || Date.now()
      }

    } catch (error) {
      console.warn('Gemini 응답 파싱 실패, 기본값 사용:', error)
      
      // Fallback parsing from text
      return this.parseTextResponse(text, imageId)
    }
  }

  private parseMultipleImagesResponse(
    response: GeminiVisionResponse,
    images: ImageAttachment[]
  ): VisionAnalysisResult[] {
    const candidate = response.candidates[0]
    const text = candidate.content.parts[0]?.text || ''
    
    try {
      // Try to parse as array of analyses
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1])
        
        if (Array.isArray(data)) {
          return data.map((analysis, index) => ({
            imageId: images[index]?.id || `image-${index}`,
            detectedElements: this.validateDetectedElements(analysis.detectedElements || []),
            identifiedPatterns: this.validateIdentifiedPatterns(analysis.identifiedPatterns || []),
            technicalRequirements: analysis.technicalRequirements || [],
            confidenceScore: Math.min(Math.max(analysis.confidenceScore || 0.7, 0), 1),
            processingTime: analysis.processingTime || Date.now()
          }))
        }
      }
      
      // Fallback: treat as single analysis for all images
      const singleAnalysis = this.parseGeminiResponse(response, 'combined')
      return images.map((image, index) => ({
        ...singleAnalysis,
        imageId: image.id
      }))

    } catch (error) {
      console.warn('다중 이미지 응답 파싱 실패, 기본값 사용:', error)
      
      return images.map(image => this.parseTextResponse(text, image.id))
    }
  }

  private parseTextResponse(text: string, imageId: string): VisionAnalysisResult {
    // Simple text-based parsing for fallback
    const detectedElements: DetectedElement[] = []
    const identifiedPatterns: IdentifiedPattern[] = []
    
    // Look for common Excel-related terms
    const excelTerms = ['표', '차트', '그래프', '데이터', '셀', '수식', '함수', '피벗']
    const foundTerms = excelTerms.filter(term => text.includes(term))
    
    if (foundTerms.length > 0) {
      detectedElements.push({
        type: 'table',
        description: `발견된 Excel 요소: ${foundTerms.join(', ')}`,
        location: { x: 0, y: 0, width: 100, height: 100 },
        confidence: 0.6,
        relatedExcelFeatures: foundTerms
      })
    }
    
    return {
      imageId,
      detectedElements,
      identifiedPatterns,
      technicalRequirements: ['Excel 기본 기능'],
      confidenceScore: 0.5,
      processingTime: Date.now()
    }
  }

  private validateDetectedElements(elements: any[]): DetectedElement[] {
    const validTypes = ['chart', 'table', 'form', 'diagram', 'ui_mockup', 'workflow', 'other']
    
    return elements
      .filter(el => el && typeof el === 'object')
      .map(el => ({
        type: validTypes.includes(el.type) ? el.type : 'other',
        description: String(el.description || ''),
        location: {
          x: Number(el.location?.x || 0),
          y: Number(el.location?.y || 0),
          width: Number(el.location?.width || 100),
          height: Number(el.location?.height || 100)
        },
        confidence: Math.min(Math.max(Number(el.confidence || 0.5), 0), 1),
        relatedExcelFeatures: Array.isArray(el.relatedExcelFeatures) 
          ? el.relatedExcelFeatures.map(String)
          : []
      }))
  }

  private validateIdentifiedPatterns(patterns: any[]): IdentifiedPattern[] {
    const validPatternTypes = ['data_structure', 'calculation_flow', 'ui_layout', 'business_logic']
    const validComplexityLevels = ['simple', 'moderate', 'complex', 'expert']
    
    return patterns
      .filter(pattern => pattern && typeof pattern === 'object')
      .map(pattern => ({
        patternType: validPatternTypes.includes(pattern.patternType) 
          ? pattern.patternType 
          : 'data_structure',
        description: String(pattern.description || ''),
        complexityLevel: validComplexityLevels.includes(pattern.complexityLevel)
          ? pattern.complexityLevel
          : 'moderate',
        implementationApproach: Array.isArray(pattern.implementationApproach)
          ? pattern.implementationApproach.map(String)
          : []
      }))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Utility method for cost estimation
  estimateCost(images: ImageAttachment[]): number {
    // Gemini 1.5 Flash pricing (approximate)
    const inputCostPer1MTokens = 0.35
    const outputCostPer1MTokens = 1.05
    
    // Rough estimation: ~1000 tokens per image + prompt
    const estimatedInputTokens = images.length * 1000 + 500
    const estimatedOutputTokens = 1000
    
    const inputCost = (estimatedInputTokens / 1000000) * inputCostPer1MTokens
    const outputCost = (estimatedOutputTokens / 1000000) * outputCostPer1MTokens
    
    return inputCost + outputCost
  }
}

// Factory function for easy instantiation
export function createGeminiVisionAIService(apiKey: string): GeminiVisionAIService {
  return new GeminiVisionAIService({
    apiKey,
    model: 'gemini-1.5-flash'
  })
}

// Configuration validation
export function validateGeminiConfig(config: Partial<GeminiConfig>): Result<GeminiConfig> {
  if (!config.apiKey) {
    return Result.failure({ code: 'OPERATION_FAILED', message: 'Gemini API 키가 필요합니다' })
  }
  
  if (config.apiKey.length < 10) {
    return Result.failure({ code: 'OPERATION_FAILED', message: '유효하지 않은 Gemini API 키입니다' })
  }
  
  return Result.success({
    apiKey: config.apiKey,
    model: config.model || 'gemini-1.5-flash',
    baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
    maxRetries: config.maxRetries || 3,
    timeout: config.timeout || 30000
  })
}