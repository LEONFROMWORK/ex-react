/**
 * 이미지 기반 설명 기능 - Vertical Slice Implementation
 * SOLID 원칙과 Vertical Slice 아키텍처 적용
 */

import { Result } from '@/Common/Result'
import { StreamingAIAnalyzer } from '@/lib/ai/streaming-analyzer'
import { RAGSystem } from '@/lib/ai/rag-system'

// === REQUEST / RESPONSE MODELS ===
export interface ImageBasedExplanationRequest {
  fileId: string
  userId: string
  images: ImageAttachment[]
  textDescription: string
  analysisType: 'structure' | 'functionality' | 'improvement' | 'troubleshooting'
  responsePreference: 'detailed' | 'concise' | 'step-by-step'
}

export interface ImageBasedExplanationResponse {
  success: boolean
  analysis: MultimodalAnalysis
  suggestions: ImplementationSuggestion[]
  estimatedComplexity: ComplexityAssessment
  followUpQuestions: string[]
  confidenceScore: number
  processingTime: number
  costIncurred: number
}

export interface ImageAttachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  base64Data: string
  description?: string
  uploadedAt: Date
}

export interface MultimodalAnalysis {
  imageAnalysis: ImageAnalysisResult[]
  contextualUnderstanding: string
  technicalInterpretation: string
  implementationPlan: string
  potentialChallenges: string[]
  estimatedTimeframe: string
}

export interface ImageAnalysisResult {
  imageId: string
  detectedElements: DetectedElement[]
  identifiedPatterns: IdentifiedPattern[]
  technicalRequirements: string[]
  confidenceScore: number
}

export interface DetectedElement {
  type: 'chart' | 'table' | 'form' | 'diagram' | 'ui_mockup' | 'workflow' | 'other'
  description: string
  location: BoundingBox
  confidence: number
  relatedExcelFeatures: string[]
}

export interface IdentifiedPattern {
  patternType: 'data_structure' | 'calculation_flow' | 'ui_layout' | 'business_logic'
  description: string
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert'
  implementationApproach: string[]
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ImplementationSuggestion {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedEffort: string
  requiredSkills: string[]
  excelFeatures: string[]
  stepByStepGuide: ImplementationStep[]
  alternatives: AlternativeApproach[]
}

export interface ImplementationStep {
  stepNumber: number
  title: string
  description: string
  excelAction: string
  expectedResult: string
  troubleshootingTips: string[]
}

export interface AlternativeApproach {
  title: string
  description: string
  prosAndCons: {
    pros: string[]
    cons: string[]
  }
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface ComplexityAssessment {
  overallComplexity: 'simple' | 'moderate' | 'complex' | 'expert'
  timeEstimate: {
    minimum: number // hours
    maximum: number // hours
    realistic: number // hours
  }
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  requiredKnowledge: string[]
  potentialRisks: string[]
}

// === DOMAIN ERRORS ===
export class ImageAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ImageAnalysisError'
  }
}

// === INTERFACES (Dependency Inversion Principle) ===
export interface IImageProcessor {
  processImage(image: ImageAttachment): Promise<Result<ProcessedImage>>
  extractVisualElements(image: ProcessedImage): Promise<Result<VisualElement[]>>
}

export interface IVisionAIService {
  analyzeImage(
    image: ImageAttachment,
    context: AnalysisContext
  ): Promise<Result<VisionAnalysisResult>>
  
  analyzeMultipleImages(
    images: ImageAttachment[],
    context: AnalysisContext
  ): Promise<Result<VisionAnalysisResult[]>>
}

export interface IContextAnalyzer {
  analyzeFileContext(fileId: string): Promise<Result<FileContext>>
  combineImageAndFileContext(
    imageAnalysis: VisionAnalysisResult[],
    fileContext: FileContext,
    textDescription: string
  ): Promise<Result<CombinedContext>>
}

export interface IImplementationPlanner {
  generateImplementationPlan(
    combinedContext: CombinedContext,
    userPreferences: UserPreferences
  ): Promise<Result<ImplementationPlan>>
}

// === CORE BUSINESS LOGIC (Single Responsibility Principle) ===
export class ImageBasedExplanationHandler {
  constructor(
    private imageProcessor: IImageProcessor,
    private visionAI: IVisionAIService,
    private contextAnalyzer: IContextAnalyzer,
    private implementationPlanner: IImplementationPlanner,
    private streamingAI: StreamingAIAnalyzer,
    private ragSystem: RAGSystem
  ) {}

  async handle(request: ImageBasedExplanationRequest): Promise<Result<ImageBasedExplanationResponse>> {
    try {
      // 1. Input Validation
      const validationResult = this.validateRequest(request)
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error)
      }

      // 2. Process Images
      const imageProcessingResult = await this.processImages(request.images)
      if (!imageProcessingResult.isSuccess) {
        return Result.failure(imageProcessingResult.error)
      }

      // 3. Analyze File Context
      const fileContextResult = await this.contextAnalyzer.analyzeFileContext(request.fileId)
      if (!fileContextResult.isSuccess) {
        return Result.failure(fileContextResult.error)
      }

      // 4. Perform Vision AI Analysis
      const visionAnalysisResult = await this.performVisionAnalysis(
        request.images,
        request.analysisType,
        fileContextResult.value
      )
      if (!visionAnalysisResult.isSuccess) {
        return Result.failure(visionAnalysisResult.error)
      }

      // 5. Combine Context (Multimodal Understanding)
      const combinedContextResult = await this.contextAnalyzer.combineImageAndFileContext(
        visionAnalysisResult.value,
        fileContextResult.value,
        request.textDescription
      )
      if (!combinedContextResult.isSuccess) {
        return Result.failure(combinedContextResult.error)
      }

      // 6. Generate Implementation Plan
      const implementationResult = await this.generateImplementationPlan(
        combinedContextResult.value,
        request
      )
      if (!implementationResult.isSuccess) {
        return Result.failure(implementationResult.error)
      }

      // 7. Enhance with RAG Knowledge
      const ragEnhancedResult = await this.enhanceWithRAGKnowledge(
        implementationResult.value,
        request
      )
      if (!ragEnhancedResult.isSuccess) {
        return Result.failure(ragEnhancedResult.error)
      }

      // 8. Build Response
      const response = this.buildResponse(
        visionAnalysisResult.value,
        ragEnhancedResult.value,
        request
      )

      return Result.success(response)

    } catch (error) {
      return Result.failure(
        new ImageAnalysisError(
          '이미지 기반 분석 중 예상치 못한 오류가 발생했습니다',
          'UNEXPECTED_ERROR',
          { originalError: error }
        )
      )
    }
  }

  private validateRequest(request: ImageBasedExplanationRequest): Result<void> {
    if (!request.fileId) {
      return Result.failure(new ImageAnalysisError('파일 ID가 필요합니다', 'MISSING_FILE_ID'))
    }

    if (!request.userId) {
      return Result.failure(new ImageAnalysisError('사용자 ID가 필요합니다', 'MISSING_USER_ID'))
    }

    if (!request.images || request.images.length === 0) {
      return Result.failure(new ImageAnalysisError('분석할 이미지가 필요합니다', 'NO_IMAGES'))
    }

    if (request.images.length > 5) {
      return Result.failure(new ImageAnalysisError('최대 5개까지 이미지를 업로드할 수 있습니다', 'TOO_MANY_IMAGES'))
    }

    // Check image file sizes
    const maxSize = 10 * 1024 * 1024 // 10MB
    for (const image of request.images) {
      if (image.fileSize > maxSize) {
        return Result.failure(new ImageAnalysisError(
          `이미지 파일 크기는 10MB를 초과할 수 없습니다: ${image.fileName}`,
          'IMAGE_TOO_LARGE'
        ))
      }
    }

    // Check supported image formats
    const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    for (const image of request.images) {
      if (!supportedFormats.includes(image.mimeType)) {
        return Result.failure(new ImageAnalysisError(
          `지원되지 않는 이미지 형식입니다: ${image.mimeType}`,
          'UNSUPPORTED_FORMAT'
        ))
      }
    }

    return Result.success(undefined)
  }

  private async processImages(images: ImageAttachment[]): Promise<Result<ProcessedImage[]>> {
    const processedImages: ProcessedImage[] = []

    for (const image of images) {
      const processingResult = await this.imageProcessor.processImage(image)
      if (!processingResult.isSuccess) {
        return Result.failure(processingResult.error)
      }
      processedImages.push(processingResult.value)
    }

    return Result.success(processedImages)
  }

  private async performVisionAnalysis(
    images: ImageAttachment[],
    analysisType: string,
    fileContext: FileContext
  ): Promise<Result<VisionAnalysisResult[]>> {
    
    const analysisContext: AnalysisContext = {
      analysisType,
      fileContext,
      domain: 'excel_analysis',
      focusAreas: this.getFocusAreas(analysisType)
    }

    return await this.visionAI.analyzeMultipleImages(images, analysisContext)
  }

  private getFocusAreas(analysisType: string): string[] {
    switch (analysisType) {
      case 'structure':
        return ['data_structure', 'table_layout', 'column_relationships', 'hierarchy']
      case 'functionality':
        return ['formulas', 'calculations', 'business_logic', 'data_flow']
      case 'improvement':
        return ['optimization_opportunities', 'best_practices', 'efficiency_gains']
      case 'troubleshooting':
        return ['error_identification', 'problem_areas', 'debugging_hints']
      default:
        return ['general_analysis']
    }
  }

  private async generateImplementationPlan(
    combinedContext: CombinedContext,
    request: ImageBasedExplanationRequest
  ): Promise<Result<ImplementationPlan>> {
    
    const userPreferences: UserPreferences = {
      responsePreference: request.responsePreference,
      analysisType: request.analysisType,
      skillLevel: 'intermediate', // Could be determined from user profile
      timeConstraints: 'flexible'
    }

    return await this.implementationPlanner.generateImplementationPlan(
      combinedContext,
      userPreferences
    )
  }

  private async enhanceWithRAGKnowledge(
    implementationPlan: ImplementationPlan,
    request: ImageBasedExplanationRequest
  ): Promise<Result<EnhancedImplementationPlan>> {
    
    // Search for similar implementation patterns
    const searchQueries = [
      `Excel ${request.analysisType} implementation`,
      ...implementationPlan.requiredFeatures.map(feature => `Excel ${feature} tutorial`),
      ...implementationPlan.challenges.map(challenge => `Excel ${challenge} solution`)
    ]

    const ragResults = await Promise.all(
      searchQueries.map(query =>
        this.ragSystem.searchSimilarSolutions(query, {
          categories: ['excel_implementation', 'tutorials'],
          threshold: 0.7
        })
      )
    )

    const enhancedPlan = this.enhanceImplementationWithRAG(
      implementationPlan,
      ragResults.flat()
    )

    return Result.success(enhancedPlan)
  }

  private enhanceImplementationWithRAG(
    plan: ImplementationPlan,
    ragResults: any[]
  ): EnhancedImplementationPlan {
    
    // Add RAG-sourced alternatives and best practices
    const enhancedSuggestions = plan.suggestions.map(suggestion => ({
      ...suggestion,
      alternatives: [
        ...suggestion.alternatives,
        ...this.extractAlternativesFromRAG(ragResults, suggestion.title)
      ],
      bestPractices: this.extractBestPracticesFromRAG(ragResults, suggestion.title)
    }))

    return {
      ...plan,
      suggestions: enhancedSuggestions,
      additionalResources: this.extractResourcesFromRAG(ragResults),
      communityInsights: this.extractCommunityInsightsFromRAG(ragResults),
      contextualSummary: "이미지 기반 분석을 통한 Excel 솔루션 제안",
      technicalAnalysis: "복잡도: 중간, 예상 시간: 2-4시간, 필요 기술: Excel 기본/수식 작성, 위험 요소: 데이터 호환성/성능 최적화",
      overviewSummary: "사용자가 제공한 이미지를 분석하여 맞춤형 Excel 솔루션을 제공합니다."
    }
  }

  private extractAlternativesFromRAG(ragResults: any[], suggestionTitle: string): AlternativeApproach[] {
    // Extract alternative approaches from RAG results
    return ragResults
      .filter(result => result.similarity > 0.8)
      .slice(0, 3)
      .map(result => ({
        title: `참조된 방법: ${result.metadata.solution}`,
        description: result.content.slice(0, 200),
        prosAndCons: {
          pros: ['검증된 방법', '커뮤니티에서 사용됨'],
          cons: ['추가 검증 필요']
        },
        difficulty: 'intermediate' as const
      }))
  }

  private extractBestPracticesFromRAG(ragResults: any[], suggestionTitle: string): string[] {
    return ragResults
      .filter(result => result.content.includes('best practice') || result.content.includes('권장'))
      .slice(0, 5)
      .map(result => result.metadata.solution || result.content.slice(0, 100))
  }

  private extractResourcesFromRAG(ragResults: any[]): AdditionalResource[] {
    return ragResults
      .slice(0, 5)
      .map(result => ({
        title: result.metadata.title || 'Related Resource',
        description: result.content.slice(0, 150),
        type: 'tutorial',
        relevanceScore: result.similarity
      }))
  }

  private extractCommunityInsightsFromRAG(ragResults: any[]): CommunityInsight[] {
    return ragResults
      .filter(result => result.metadata.usageCount > 10)
      .slice(0, 3)
      .map(result => ({
        insight: result.content.slice(0, 200),
        popularity: result.metadata.usageCount,
        effectiveness: result.metadata.confidence
      }))
  }

  private buildResponse(
    visionResults: VisionAnalysisResult[],
    enhancedPlan: EnhancedImplementationPlan,
    request: ImageBasedExplanationRequest
  ): ImageBasedExplanationResponse {
    
    const imageAnalysis = visionResults.map(result => ({
      imageId: result.imageId,
      detectedElements: result.detectedElements,
      identifiedPatterns: result.identifiedPatterns,
      technicalRequirements: result.technicalRequirements,
      confidenceScore: result.confidenceScore
    }))

    const multimodalAnalysis: MultimodalAnalysis = {
      imageAnalysis,
      contextualUnderstanding: enhancedPlan.contextualSummary,
      technicalInterpretation: enhancedPlan.technicalAnalysis,
      implementationPlan: enhancedPlan.overviewSummary,
      potentialChallenges: enhancedPlan.challenges,
      estimatedTimeframe: enhancedPlan.timeline
    }

    return {
      success: true,
      analysis: multimodalAnalysis,
      suggestions: enhancedPlan.suggestions,
      estimatedComplexity: enhancedPlan.complexity,
      followUpQuestions: this.generateFollowUpQuestions(enhancedPlan, request),
      confidenceScore: this.calculateOverallConfidence(visionResults),
      processingTime: Date.now(), // Would track actual time
      costIncurred: this.calculateCost(request.images.length, enhancedPlan.complexity.overallComplexity)
    }
  }

  private generateFollowUpQuestions(
    plan: EnhancedImplementationPlan,
    request: ImageBasedExplanationRequest
  ): string[] {
    const questions = [
      '구현하실 때 가장 우선순위가 높은 기능은 무엇인가요?',
      '현재 Excel 숙련도는 어느 정도인가요?',
      '이 기능을 언제까지 완성해야 하나요?'
    ]

    // Add context-specific questions
    if (plan.complexity.overallComplexity === 'complex') {
      questions.push('복잡한 구현이 예상됩니다. 단계별로 나누어 진행하시겠어요?')
    }

    if (plan.suggestions.some(s => s.requiredSkills.includes('VBA'))) {
      questions.push('VBA 매크로 사용 경험이 있으신가요?')
    }

    return questions
  }

  private calculateOverallConfidence(visionResults: VisionAnalysisResult[]): number {
    if (visionResults.length === 0) return 0
    
    const avgConfidence = visionResults.reduce((sum, result) => sum + result.confidenceScore, 0) / visionResults.length
    return Math.round(avgConfidence * 100) / 100
  }

  private calculateCost(imageCount: number, complexity: string): number {
    const baseCostPerImage = 0.10
    const complexityMultiplier = {
      'simple': 1.0,
      'moderate': 1.5,
      'complex': 2.0,
      'expert': 3.0
    }

    return imageCount * baseCostPerImage * (complexityMultiplier[complexity as keyof typeof complexityMultiplier] || 1.0)
  }
}

// === SUPPORTING TYPES ===
interface ProcessedImage {
  id: string
  originalImage: ImageAttachment
  processedData: any
  metadata: ImageMetadata
}

interface ImageMetadata {
  dimensions: { width: number; height: number }
  format: string
  hasText: boolean
  colorProfile: string
  estimatedComplexity: string
}

interface VisualElement {
  type: string
  description: string
  location: BoundingBox
  confidence: number
}

export interface VisionAnalysisResult {
  imageId: string
  detectedElements: DetectedElement[]
  identifiedPatterns: IdentifiedPattern[]
  technicalRequirements: string[]
  confidenceScore: number
  processingTime: number
}

export interface AnalysisContext {
  analysisType: string
  fileContext: FileContext
  domain: string
  focusAreas: string[]
}

interface FileContext {
  fileType: string
  currentStructure: any
  existingFormulas: string[]
  dataPatterns: string[]
  userObjectives: string[]
}

interface CombinedContext {
  imageInsights: VisionAnalysisResult[]
  fileAnalysis: FileContext
  userIntent: string
  technicalRequirements: string[]
  constraintsAndPreferences: any
}

interface UserPreferences {
  responsePreference: string
  analysisType: string
  skillLevel: string
  timeConstraints: string
}

interface ImplementationPlan {
  suggestions: ImplementationSuggestion[]
  complexity: ComplexityAssessment
  requiredFeatures: string[]
  challenges: string[]
  timeline: string
}

interface EnhancedImplementationPlan extends ImplementationPlan {
  contextualSummary: string
  technicalAnalysis: string
  overviewSummary: string
  additionalResources: AdditionalResource[]
  communityInsights: CommunityInsight[]
}

interface AdditionalResource {
  title: string
  description: string
  type: string
  relevanceScore: number
}

interface CommunityInsight {
  insight: string
  popularity: number
  effectiveness: number
}

// === USAGE EXAMPLE ===
export async function analyzeImageBasedExplanation(
  request: ImageBasedExplanationRequest
): Promise<Result<ImageBasedExplanationResponse>> {
  // Dependency injection following SOLID principles
  const handler = new ImageBasedExplanationHandler(
    new ImageProcessorImpl(),
    new VisionAIServiceImpl(),
    new ContextAnalyzerImpl(),
    new ImplementationPlannerImpl(),
    new StreamingAIAnalyzer(process.env.OPENROUTER_API_KEY!),
    new RAGSystem(process.env.OPENROUTER_API_KEY!)
  )

  return await handler.handle(request)
}

// === IMPLEMENTATIONS ===
import { GeminiVisionAIService, createGeminiVisionAIService } from './implementations/GeminiVisionAIService'

class ImageProcessorImpl implements IImageProcessor {
  async processImage(image: ImageAttachment): Promise<Result<ProcessedImage>> {
    try {
      // Basic image processing - validate and prepare metadata
      const processedImage: ProcessedImage = {
        id: image.id,
        originalImage: image,
        processedData: {
          validated: true,
          timestamp: Date.now()
        },
        metadata: {
          dimensions: { width: 0, height: 0 }, // Would extract from image
          format: image.mimeType,
          hasText: image.description ? image.description.length > 0 : false,
          colorProfile: 'sRGB',
          estimatedComplexity: this.estimateImageComplexity(image)
        }
      }

      return Result.success(processedImage)
    } catch (error) {
      return Result.failure({
        code: 'IMAGE_PROCESSING_FAILED',
        message: `이미지 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      })
    }
  }

  async extractVisualElements(image: ProcessedImage): Promise<Result<VisualElement[]>> {
    // Basic visual element extraction would go here
    const elements: VisualElement[] = [
      {
        type: 'general',
        description: '일반적인 이미지 요소',
        location: { x: 0, y: 0, width: 100, height: 100 },
        confidence: 0.7
      }
    ]
    
    return Result.success(elements)
  }

  private estimateImageComplexity(image: ImageAttachment): string {
    if (image.fileSize > 5 * 1024 * 1024) return 'complex'
    if (image.fileSize > 1 * 1024 * 1024) return 'moderate'
    return 'simple'
  }
}

class VisionAIServiceImpl implements IVisionAIService {
  private geminiService: GeminiVisionAIService | null = null
  private openRouterService: any | null = null

  constructor() {
    // Gemini 우선 시도
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (geminiKey) {
      this.geminiService = createGeminiVisionAIService(geminiKey)
    }

    // OpenRouter 백업 (GPT-4 Vision 또는 Claude Vision 사용)
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (openRouterKey) {
      // OpenRouter Vision service would be implemented here
      console.log('OpenRouter Vision API 준비됨 (백업)')
    }
  }

  async analyzeImage(image: ImageAttachment, context: AnalysisContext): Promise<Result<VisionAnalysisResult>> {
    // Gemini 우선 사용
    if (this.geminiService) {
      const result = await this.geminiService.analyzeImage(image, context)
      if (result.isSuccess) {
        return result
      }
      console.warn('Gemini Vision 실패, OpenRouter로 전환 시도')
    }

    // OpenRouter 백업 (나중에 구현)
    if (this.openRouterService) {
      return await this.openRouterService.analyzeImage(image, context)
    }

    return Result.failure({ code: 'OPERATION_FAILED', message: '사용 가능한 Vision AI 서비스가 없습니다'})
  }

  async analyzeMultipleImages(images: ImageAttachment[], context: AnalysisContext): Promise<Result<VisionAnalysisResult[]>> {
    // Gemini 우선 사용
    if (this.geminiService) {
      const result = await this.geminiService.analyzeMultipleImages(images, context)
      if (result.isSuccess) {
        return result
      }
      console.warn('Gemini Vision 실패, OpenRouter로 전환 시도')
    }

    // OpenRouter 백업 (나중에 구현)
    if (this.openRouterService) {
      return await this.openRouterService.analyzeMultipleImages(images, context)
    }

    return Result.failure({ code: 'OPERATION_FAILED', message: '사용 가능한 Vision AI 서비스가 없습니다'})
  }
}

class ContextAnalyzerImpl implements IContextAnalyzer {
  async analyzeFileContext(fileId: string): Promise<Result<FileContext>> {
    try {
      // Mock file context analysis - in real implementation would query database
      const mockFileContext: FileContext = {
        fileType: 'xlsx',
        currentStructure: {
          sheets: ['Sheet1', 'Data', 'Analysis'],
          totalRows: 1000,
          totalColumns: 15,
          hasFormulas: true,
          hasCharts: false
        },
        existingFormulas: [
          'SUM(A1:A10)',
          'VLOOKUP(B2,Data!A:C,3,FALSE)',
          'IF(C2>100,"High","Low")'
        ],
        dataPatterns: [
          'time_series_data',
          'categorical_grouping',
          'numerical_calculations'
        ],
        userObjectives: [
          '데이터 분석 및 시각화',
          '자동화된 리포트 생성',
          '성능 최적화'
        ]
      }

      return Result.success(mockFileContext)
    } catch (error) {
      return Result.failure({ code: 'OPERATION_FAILED', message: `파일 컨텍스트 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` })
    }
  }

  async combineImageAndFileContext(
    imageAnalysis: VisionAnalysisResult[],
    fileContext: FileContext,
    textDescription: string
  ): Promise<Result<CombinedContext>> {
    try {
      // Extract technical requirements from image analysis
      const allTechRequirements = imageAnalysis
        .flatMap(analysis => analysis.technicalRequirements)
        .filter((req, index, arr) => arr.indexOf(req) === index) // Remove duplicates

      // Combine insights from all images
      const combinedContext: CombinedContext = {
        imageInsights: imageAnalysis,
        fileAnalysis: fileContext,
        userIntent: textDescription,
        technicalRequirements: [
          ...allTechRequirements,
          ...fileContext.existingFormulas.map(formula => `기존 수식 호환: ${formula}`)
        ],
        constraintsAndPreferences: {
          maintainExistingStructure: true,
          optimizePerformance: true,
          ensureDataIntegrity: true,
          userSkillLevel: 'intermediate'
        }
      }

      return Result.success(combinedContext)
    } catch (error) {
      return Result.failure({ code: 'OPERATION_FAILED', message: `컨텍스트 결합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` })
    }
  }
}

class ImplementationPlannerImpl implements IImplementationPlanner {
  async generateImplementationPlan(
    combinedContext: CombinedContext,
    userPreferences: UserPreferences
  ): Promise<Result<ImplementationPlan>> {
    try {
      // Analyze complexity based on detected elements and patterns
      const complexity = this.assessComplexity(combinedContext)
      
      // Generate implementation suggestions
      const suggestions = this.generateSuggestions(combinedContext, userPreferences)
      
      // Identify potential challenges
      const challenges = this.identifyChallenges(combinedContext)
      
      // Create timeline estimation
      const timeline = this.estimateTimeline(complexity, suggestions.length)

      const implementationPlan: ImplementationPlan = {
        suggestions,
        complexity,
        requiredFeatures: this.extractRequiredFeatures(combinedContext),
        challenges,
        timeline
      }

      return Result.success(implementationPlan)
    } catch (error) {
      return Result.failure({ code: 'OPERATION_FAILED', message: `구현 계획 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` })
    }
  }

  private assessComplexity(context: CombinedContext): ComplexityAssessment {
    const elementCount = context.imageInsights.reduce((sum, insight) => 
      sum + insight.detectedElements.length, 0
    )
    
    const hasComplexPatterns = context.imageInsights.some(insight =>
      insight.identifiedPatterns.some(pattern => 
        pattern.complexityLevel === 'complex' || pattern.complexityLevel === 'expert'
      )
    )

    let overallComplexity: 'simple' | 'moderate' | 'complex' | 'expert'
    let timeEstimate: { minimum: number; maximum: number; realistic: number }
    
    if (hasComplexPatterns || elementCount > 10) {
      overallComplexity = 'complex'
      timeEstimate = { minimum: 8, maximum: 24, realistic: 16 }
    } else if (elementCount > 5) {
      overallComplexity = 'moderate'
      timeEstimate = { minimum: 3, maximum: 12, realistic: 6 }
    } else {
      overallComplexity = 'simple'
      timeEstimate = { minimum: 1, maximum: 6, realistic: 3 }
    }

    return {
      overallComplexity,
      timeEstimate,
      skillLevel: hasComplexPatterns ? 'advanced' : 'intermediate',
      requiredKnowledge: [
        'Excel 기본 기능',
        '수식 작성',
        ...(hasComplexPatterns ? ['VBA 매크로', '고급 함수'] : [])
      ],
      potentialRisks: [
        '데이터 손실 위험',
        '성능 저하 가능성',
        ...(hasComplexPatterns ? ['복잡성으로 인한 유지보수 어려움'] : [])
      ]
    }
  }

  private generateSuggestions(
    context: CombinedContext,
    preferences: UserPreferences
  ): ImplementationSuggestion[] {
    const suggestions: ImplementationSuggestion[] = []

    // Generate suggestions based on detected elements
    context.imageInsights.forEach((insight, imageIndex) => {
      insight.detectedElements.forEach((element, elementIndex) => {
        const suggestion: ImplementationSuggestion = {
          id: `suggestion-${imageIndex}-${elementIndex}`,
          title: `${element.type} 구현`,
          description: `이미지에서 감지된 ${element.description}을 Excel에서 구현`,
          priority: element.confidence > 0.8 ? 'high' : 'medium',
          estimatedEffort: this.estimateEffort(element.type),
          requiredSkills: this.getRequiredSkills(element.type),
          excelFeatures: element.relatedExcelFeatures,
          stepByStepGuide: this.generateSteps(element),
          alternatives: this.generateAlternatives(element)
        }
        suggestions.push(suggestion)
      })
    })

    return suggestions
  }

  private identifyChallenges(context: CombinedContext): string[] {
    const challenges: string[] = []

    // Check for data compatibility issues
    if (context.fileAnalysis.existingFormulas.length > 0) {
      challenges.push('기존 수식과의 호환성 확보')
    }

    // Check for performance concerns
    const largeDataset = context.fileAnalysis.currentStructure?.totalRows > 1000
    if (largeDataset) {
      challenges.push('대용량 데이터 처리 성능 최적화')
    }

    // Check for complex patterns
    const hasComplexPatterns = context.imageInsights.some(insight =>
      insight.identifiedPatterns.some(p => p.complexityLevel === 'expert')
    )
    if (hasComplexPatterns) {
      challenges.push('복잡한 비즈니스 로직 구현')
    }

    return challenges
  }

  private estimateTimeline(complexity: ComplexityAssessment, suggestionCount: number): string {
    const baseTime = complexity.timeEstimate.realistic
    const totalTime = baseTime + (suggestionCount * 0.5)
    
    if (totalTime < 4) return '몇 시간 내'
    if (totalTime < 24) return '1-2일'
    if (totalTime < 72) return '2-3일'
    return '1주일 이상'
  }

  private extractRequiredFeatures(context: CombinedContext): string[] {
    const features = new Set<string>()
    
    context.imageInsights.forEach(insight => {
      insight.detectedElements.forEach(element => {
        element.relatedExcelFeatures.forEach(feature => features.add(feature))
      })
    })

    return Array.from(features)
  }

  private estimateEffort(elementType: string): string {
    const effortMap: Record<string, string> = {
      'chart': '2-4시간',
      'table': '1-2시간',
      'form': '3-6시간',
      'diagram': '4-8시간',
      'ui_mockup': '6-12시간',
      'workflow': '8-16시간',
      'other': '1-3시간'
    }
    return effortMap[elementType] || '예상 불가'
  }

  private getRequiredSkills(elementType: string): string[] {
    const skillMap: Record<string, string[]> = {
      'chart': ['차트 생성', '데이터 시각화'],
      'table': ['테이블 구성', '데이터 정렬'],
      'form': ['양식 디자인', '데이터 입력 검증'],
      'diagram': ['도형 삽입', '연결선 구성'],
      'ui_mockup': ['사용자 인터페이스 디자인', 'VBA 매크로'],
      'workflow': ['프로세스 자동화', 'VBA 프로그래밍'],
      'other': ['Excel 기본 기능']
    }
    return skillMap[elementType] || ['Excel 기본 기능']
  }

  private generateSteps(element: DetectedElement): ImplementationStep[] {
    // Generate basic implementation steps based on element type
    const baseSteps: ImplementationStep[] = [
      {
        stepNumber: 1,
        title: '데이터 준비',
        description: `${element.type} 구현에 필요한 데이터를 준비합니다`,
        excelAction: '데이터 → 데이터 가져오기',
        expectedResult: '구조화된 데이터 테이블',
        troubleshootingTips: ['데이터 형식 확인', '누락된 값 처리']
      },
      {
        stepNumber: 2,
        title: `${element.type} 생성`,
        description: element.description,
        excelAction: `삽입 → ${element.type}`,
        expectedResult: `완성된 ${element.type}`,
        troubleshootingTips: ['올바른 데이터 범위 선택', '적절한 차트 유형 선택']
      }
    ]

    return baseSteps
  }

  private generateAlternatives(element: DetectedElement): AlternativeApproach[] {
    return [
      {
        title: '단순 구현',
        description: `기본 Excel 기능만 사용한 ${element.type} 구현`,
        prosAndCons: {
          pros: ['구현 용이', '안정성'],
          cons: ['제한된 기능', '수동 작업 필요']
        },
        difficulty: 'beginner'
      },
      {
        title: '고급 구현',
        description: `VBA 매크로를 활용한 고급 ${element.type} 구현`,
        prosAndCons: {
          pros: ['자동화', '풍부한 기능'],
          cons: ['복잡성', '유지보수 어려움']
        },
        difficulty: 'advanced'
      }
    ]
  }
}