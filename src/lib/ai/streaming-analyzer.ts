// Temporary stub for StreamingAIAnalyzer
export class StreamingAIAnalyzer {
  constructor(config?: any) {}
  
  async streamingAnalysis(prompt: string, tier: number = 1, options?: any, callbacks?: any) {
    return {
      analysis: "Mock streaming analysis",
      confidence: 0.8,
      tier,
      credits: 1
    };
  }
  
  async analyzeWithStreaming(prompt: string, callbacks?: any) {
    return {
      analysis: "Mock streaming analysis",
      confidence: 0.8,
      tier: 1,
      credits: 1
    };
  }
}