import { Result } from '@/Common/Result'

// Request and Response DTOs
export interface ClassifyIntentRequest {
  message: string
  context?: {
    fileId?: string
    analysisId?: string
    conversationId?: string
  }
}

export interface ClassifyIntentResponse {
  intent: 'simple' | 'complex' | 'clarification_needed'
  taskType: string
  complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
  confidence: number
  suggestedFeatures?: string[]
}

// Intent patterns
interface IntentPattern {
  pattern: RegExp
  category: string
  complexity: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
  taskType: string
}

// Intent classifier service
export class IntentClassifier {
  private readonly simplePatterns: IntentPattern[] = [
    { 
      pattern: /템플릿|template|양식/i, 
      category: 'simple_template',
      complexity: 'SIMPLE',
      taskType: 'CREATE'
    },
    { 
      pattern: /간단한|기본|basic|simple/i, 
      category: 'simple_operation',
      complexity: 'SIMPLE',
      taskType: 'GENERAL'
    },
    { 
      pattern: /만들어|생성|create|make/i, 
      category: 'simple_creation',
      complexity: 'SIMPLE',
      taskType: 'CREATE'
    },
  ]

  private readonly complexPatterns: IntentPattern[] = [
    {
      pattern: /복잡한|complex|advanced|고급/i,
      category: 'complex_operation',
      complexity: 'COMPLEX',
      taskType: 'GENERAL'
    },
    {
      pattern: /맞춤|custom|personalized|커스텀/i,
      category: 'customization',
      complexity: 'COMPLEX',
      taskType: 'CREATE'
    },
    {
      pattern: /분석|analysis|analyze|검토/i,
      category: 'analysis',
      complexity: 'MEDIUM',
      taskType: 'ANALYZE'
    },
    {
      pattern: /최적화|optimize|개선|improve/i,
      category: 'optimization',
      complexity: 'COMPLEX',
      taskType: 'OPTIMIZE'
    },
    {
      pattern: /수정|고치|fix|correct|오류/i,
      category: 'correction',
      complexity: 'MEDIUM',
      taskType: 'CORRECT'
    },
    {
      pattern: /변환|convert|transform|전환/i,
      category: 'transformation',
      complexity: 'MEDIUM',
      taskType: 'TRANSFORM'
    },
  ]

  classifyIntent(message: string): ClassifyIntentResponse {
    let matchedPattern: IntentPattern | null = null
    let confidence = 0

    // Check for simple patterns
    for (const pattern of this.simplePatterns) {
      if (pattern.pattern.test(message)) {
        matchedPattern = pattern
        confidence = 0.8
        break
      }
    }

    // Check for complex patterns (override simple if found)
    for (const pattern of this.complexPatterns) {
      if (pattern.pattern.test(message)) {
        matchedPattern = pattern
        confidence = 0.9
        break
      }
    }

    // Default classification based on message length and complexity
    if (!matchedPattern) {
      if (message.length < 20) {
        return {
          intent: 'clarification_needed',
          taskType: 'GENERAL',
          complexity: 'SIMPLE',
          confidence: 0.3,
          suggestedFeatures: ['기본 템플릿', '고급 분석', '맞춤 제작']
        }
      } else if (message.length > 100) {
        return {
          intent: 'complex',
          taskType: 'GENERAL',
          complexity: 'COMPLEX',
          confidence: 0.6
        }
      } else {
        return {
          intent: 'simple',
          taskType: 'GENERAL',
          complexity: 'MEDIUM',
          confidence: 0.5
        }
      }
    }

    // Determine intent based on complexity
    let intent: 'simple' | 'complex' | 'clarification_needed'
    if (matchedPattern.complexity === 'SIMPLE') {
      intent = 'simple'
    } else if (matchedPattern.complexity === 'COMPLEX') {
      intent = 'complex'
    } else {
      intent = 'complex' // Medium complexity defaults to complex
    }

    return {
      intent,
      taskType: matchedPattern.taskType,
      complexity: matchedPattern.complexity,
      confidence
    }
  }

  // Extract additional features from message
  extractFeatures(message: string): string[] {
    const features: string[] = []
    
    const featurePatterns = [
      { pattern: /차트|chart|그래프|graph/i, feature: '차트 생성' },
      { pattern: /피벗|pivot/i, feature: '피벗 테이블' },
      { pattern: /매크로|macro|vba/i, feature: 'VBA 매크로' },
      { pattern: /수식|formula|함수/i, feature: '고급 수식' },
      { pattern: /서식|format|스타일/i, feature: '조건부 서식' },
      { pattern: /데이터.*유효성|validation/i, feature: '데이터 유효성 검사' },
    ]

    for (const { pattern, feature } of featurePatterns) {
      if (pattern.test(message)) {
        features.push(feature)
      }
    }

    return features
  }
}

// Handler
export class ClassifyIntentHandler {
  private readonly classifier: IntentClassifier

  constructor(classifier?: IntentClassifier) {
    this.classifier = classifier || new IntentClassifier()
  }

  async handle(request: ClassifyIntentRequest): Promise<Result<ClassifyIntentResponse>> {
    try {
      // Classify intent
      const classification = this.classifier.classifyIntent(request.message)

      // Extract additional features if needed
      if (classification.intent === 'complex' || classification.intent === 'clarification_needed') {
        const extractedFeatures = this.classifier.extractFeatures(request.message)
        if (extractedFeatures.length > 0) {
          classification.suggestedFeatures = extractedFeatures
        }
      }

      // Adjust based on context if available
      if (request.context?.analysisId) {
        // If there's an analysis context, likely dealing with corrections
        if (classification.taskType === 'GENERAL') {
          classification.taskType = 'CORRECT'
        }
      }

      return Result.success(classification)
    } catch (error) {
      console.error('Intent classification failed:', error)
      return Result.failure({
        code: 'ClassifyIntent.Failed',
        message: '의도 분석에 실패했습니다.'
      })
    }
  }
}