// Vertical Slice Architecture - Q&A System Feature Module
import { QASystemService } from './services/qa-system.service'
import { QARepository } from './repositories/qa.repository'
import { IntelligentQAEngine } from './engines/intelligent-qa.engine'
import { QuestionClassifier } from './classifiers/question.classifier'
import { VectorSearchEngine } from './engines/vector-search.engine'

export class QASystemModule {
  private static instance: QASystemModule
  private service: QASystemService
  private repository: QARepository
  
  private constructor() {
    // 의존성 주입
    this.repository = new QARepository()
    
    const classifier = new QuestionClassifier()
    const searchEngine = new VectorSearchEngine()
    const qaEngine = new IntelligentQAEngine(classifier, searchEngine)
    
    this.service = new QASystemService(this.repository, qaEngine)
  }
  
  static getInstance(): QASystemModule {
    if (!QASystemModule.instance) {
      QASystemModule.instance = new QASystemModule()
    }
    return QASystemModule.instance
  }
  
  // Public API
  async askQuestion(question: string, userId: string) {
    return this.service.processQuestion(question, userId)
  }
  
  async loadQAData(dataPath: string) {
    return this.service.loadQAData(dataPath)
  }
  
  async getQuestionHistory(userId: string, limit: number = 10) {
    return this.repository.getQuestionHistory(userId, limit)
  }
  
  async submitFeedback(questionId: string, feedback: any, userId: string) {
    return this.service.processFeedback(questionId, feedback, userId)
  }
  
  // Health check
  async healthCheck() {
    return {
      status: 'healthy',
      details: {
        qaDataCount: await this.repository.getQACount(),
        vectorIndexStatus: await this.service.getVectorIndexStatus()
      }
    }
  }
}