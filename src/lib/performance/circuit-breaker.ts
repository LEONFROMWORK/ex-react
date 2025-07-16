// Circuit Breaker Pattern - 시스템 안정성 향상
export interface CircuitBreakerOptions {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
  fallback?: () => any
}

export class CircuitBreaker<T = any> {
  private failures = 0
  private lastFailTime = 0
  private successCount = 0
  private totalRequests = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000 // 5 minutes
    }
  ) {}
  
  async execute(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++
    
    // Circuit is OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFail = Date.now() - this.lastFailTime
      
      if (timeSinceLastFail > this.options.resetTimeout) {
        this.state = 'HALF_OPEN'
        console.log(`Circuit Breaker [${this.name}]: Attempting recovery (HALF_OPEN)`)
      } else {
        console.error(`Circuit Breaker [${this.name}]: Circuit is OPEN, rejecting request`)
        
        if (this.options.fallback) {
          return this.options.fallback()
        }
        
        throw new Error(`Service ${this.name} is temporarily unavailable`)
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.successCount++
    
    if (this.state === 'HALF_OPEN') {
      console.log(`Circuit Breaker [${this.name}]: Recovery successful, closing circuit`)
      this.reset()
    }
    
    this.failures = 0
  }
  
  private onFailure() {
    this.failures++
    this.lastFailTime = Date.now()
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN'
      console.error(`Circuit Breaker [${this.name}]: Threshold exceeded, opening circuit`)
      
      // Emit event for monitoring
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('circuit-breaker-open', {
          detail: { name: this.name, failures: this.failures }
        }))
      }
    }
  }
  
  private reset() {
    this.state = 'CLOSED'
    this.failures = 0
    this.lastFailTime = 0
  }
  
  // Monitoring methods
  getState() {
    return this.state
  }
  
  getStats() {
    const successRate = this.totalRequests > 0 
      ? (this.successCount / this.totalRequests) * 100 
      : 0
      
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      successRate: successRate.toFixed(2) + '%',
      lastFailTime: this.lastFailTime ? new Date(this.lastFailTime).toISOString() : null
    }
  }
}

// Singleton instances for different services
export const circuitBreakers = {
  excelAnalysis: new CircuitBreaker('ExcelAnalysis', {
    failureThreshold: 3,
    resetTimeout: 30000,
    monitoringPeriod: 300000,
    fallback: () => ({
      success: false,
      error: 'Excel analysis service is temporarily unavailable. Please try again later.',
      fallback: true
    })
  }),
  
  qaSystem: new CircuitBreaker('QASystem', {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 300000,
    fallback: () => ({
      success: false,
      answer: 'Q&A 시스템이 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
      fallback: true
    })
  }),
  
  aiService: new CircuitBreaker('AIService', {
    failureThreshold: 2,
    resetTimeout: 120000,
    monitoringPeriod: 600000
  })
}