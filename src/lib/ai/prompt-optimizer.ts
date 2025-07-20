/**
 * 프롬프트 최적화 엔진
 * 성공적인 응답 패턴을 학습하고 도메인별 프롬프트 템플릿 관리
 */

import { prisma } from '@/lib/prisma';
import { FeedbackLearningService } from './feedback-learning';

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'general' | 'error_analysis' | 'formula_help' | 'data_validation' | 'chart_analysis';
  language: 'ko' | 'en';
  template: string;
  variables: string[]; // 템플릿에서 사용되는 변수 목록
  examples?: Record<string, string>; // 변수 예시
  performance?: {
    usageCount: number;
    avgQualityScore: number;
    avgResponseTime: number;
    successRate: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptOptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: string[];
  expectedQualityImprovement: number; // 0-1
  templateUsed?: string;
}

export class PromptOptimizer {
  private feedbackLearning: FeedbackLearningService;
  private templates: Map<string, PromptTemplate> = new Map();
  private successfulPatterns: Map<string, string[]> = new Map();

  // 프롬프트 개선을 위한 패턴
  private improvementPatterns = {
    structure: {
      patterns: [
        { match: /분석해/, replace: '다음 관점에서 분석해주세요:\n1. ' },
        { match: /해결/, replace: '단계별로 해결 방법을 제시해주세요:\n' },
        { match: /오류/, replace: '발견된 오류와 원인, 해결책을 표로 정리해주세요:\n' }
      ],
      weight: 0.2
    },
    specificity: {
      patterns: [
        { match: /문제/, replace: '구체적인 문제점' },
        { match: /확인/, replace: '다음 항목들을 확인' },
        { match: /수정/, replace: '정확한 위치와 수정 방법을 제시' }
      ],
      weight: 0.15
    },
    expertise: {
      patterns: [
        { prefix: '', suffix: '\n\nExcel 전문가의 관점에서 답변해주세요.' },
        { prefix: '당신은 20년 경력의 Excel 전문가입니다. ', suffix: '' }
      ],
      weight: 0.1
    },
    clarity: {
      patterns: [
        { match: /알려/, replace: '구체적인 예시와 함께 설명' },
        { match: /도와/, replace: '실행 가능한 단계별 가이드 제공' }
      ],
      weight: 0.15
    }
  };

  constructor() {
    this.feedbackLearning = new FeedbackLearningService();
    this.loadTemplates();
  }

  /**
   * 프롬프트 최적화
   */
  async optimizePrompt(
    originalPrompt: string,
    context?: {
      category?: string;
      userTier?: string;
      previousFeedback?: any[];
      taskComplexity?: 'low' | 'medium' | 'high';
    }
  ): Promise<PromptOptimizationResult> {
    const improvements: string[] = [];
    let optimizedPrompt = originalPrompt;

    // 1. 템플릿 매칭
    const matchedTemplate = await this.findBestTemplate(originalPrompt, context?.category);
    if (matchedTemplate) {
      optimizedPrompt = this.applyTemplate(matchedTemplate, originalPrompt);
      improvements.push(`템플릿 적용: ${matchedTemplate.name}`);
    }

    // 2. 성공 패턴 적용
    const successPatterns = await this.getSuccessfulPatterns(context?.category || 'general');
    for (const pattern of successPatterns) {
      if (this.shouldApplyPattern(optimizedPrompt, pattern)) {
        optimizedPrompt = this.applySuccessPattern(optimizedPrompt, pattern);
        improvements.push('성공적인 패턴 적용');
      }
    }

    // 3. 구조 개선
    const structureResult = this.improveStructure(optimizedPrompt);
    if (structureResult.improved) {
      optimizedPrompt = structureResult.prompt;
      improvements.push(...structureResult.improvements);
    }

    // 4. 명확성 개선
    const clarityResult = this.improveClarity(optimizedPrompt);
    if (clarityResult.improved) {
      optimizedPrompt = clarityResult.prompt;
      improvements.push(...clarityResult.improvements);
    }

    // 5. 도메인 특화 개선
    const domainResult = this.applyDomainSpecificImprovements(optimizedPrompt, context);
    if (domainResult.improved) {
      optimizedPrompt = domainResult.prompt;
      improvements.push(...domainResult.improvements);
    }

    // 6. 길이 최적화
    optimizedPrompt = this.optimizeLength(optimizedPrompt);

    // 품질 개선 예측
    const expectedImprovement = this.calculateExpectedImprovement(
      originalPrompt,
      optimizedPrompt,
      improvements.length
    );

    return {
      originalPrompt,
      optimizedPrompt,
      improvements,
      expectedQualityImprovement: expectedImprovement,
      templateUsed: matchedTemplate?.name
    };
  }

  /**
   * 템플릿 찾기
   */
  private async findBestTemplate(
    prompt: string,
    category?: string
  ): Promise<PromptTemplate | null> {
    const candidates = Array.from(this.templates.values()).filter(t => 
      t.isActive && (!category || t.category === category)
    );

    if (candidates.length === 0) return null;

    // 프롬프트와 템플릿의 유사도 계산
    const scored = candidates.map(template => ({
      template,
      score: this.calculateTemplateSimilarity(prompt, template)
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.score > 0.7 ? scored[0].template : null;
  }

  /**
   * 템플릿 적용
   */
  private applyTemplate(template: PromptTemplate, originalPrompt: string): string {
    let result = template.template;

    // 변수 추출 및 치환
    const extractedVars = this.extractVariables(originalPrompt, template.variables);
    
    for (const [variable, value] of Object.entries(extractedVars)) {
      result = result.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * 구조 개선
   */
  private improveStructure(prompt: string): {
    improved: boolean;
    prompt: string;
    improvements: string[];
  } {
    let improved = false;
    let result = prompt;
    const improvements: string[] = [];

    // 번호 목록으로 구조화
    if (!result.includes('\n') && result.length > 100) {
      const sentences = result.split(/[.!?]/).filter(s => s.trim().length > 0);
      if (sentences.length > 2) {
        result = sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
        improved = true;
        improvements.push('번호 목록으로 구조화');
      }
    }

    // 섹션 구분
    if (result.includes('그리고') || result.includes('또한')) {
      result = result.replace(/그리고|또한/g, '\n\n추가로,');
      improved = true;
      improvements.push('섹션 구분 개선');
    }

    return { improved, prompt: result, improvements };
  }

  /**
   * 명확성 개선
   */
  private improveClarity(prompt: string): {
    improved: boolean;
    prompt: string;
    improvements: string[];
  } {
    let improved = false;
    let result = prompt;
    const improvements: string[] = [];

    // 모호한 표현 제거
    const vagueTerms = {
      '문제': '구체적인 문제',
      '오류': 'Excel 오류',
      '도움': '단계별 해결 방법',
      '분석': '상세 분석'
    };

    for (const [vague, specific] of Object.entries(vagueTerms)) {
      if (result.includes(vague)) {
        result = result.replace(new RegExp(vague, 'g'), specific);
        improved = true;
      }
    }

    if (improved) {
      improvements.push('모호한 표현을 구체화');
    }

    // 목적 명확화
    if (!result.includes('위해') && !result.includes('하려면')) {
      result += '\n\n이를 통해 정확한 해결책을 제시해주세요.';
      improved = true;
      improvements.push('목적 명확화');
    }

    return { improved, prompt: result, improvements };
  }

  /**
   * 도메인 특화 개선
   */
  private applyDomainSpecificImprovements(
    prompt: string,
    context?: any
  ): {
    improved: boolean;
    prompt: string;
    improvements: string[];
  } {
    let improved = false;
    let result = prompt;
    const improvements: string[] = [];

    // Excel 특화 키워드 강화
    const excelKeywords = ['수식', '함수', '셀', '워크시트', '피벗테이블', '차트'];
    let hasExcelContext = excelKeywords.some(kw => prompt.includes(kw));

    if (!hasExcelContext && context?.category?.includes('excel')) {
      result = `Excel 스프레드시트 관련 질문입니다.\n${result}`;
      improved = true;
      improvements.push('Excel 컨텍스트 추가');
    }

    // 복잡도에 따른 조정
    if (context?.taskComplexity === 'high') {
      result += '\n\n복잡한 문제이므로 다음을 포함해주세요:\n- 전체적인 접근 방법\n- 잠재적 위험 요소\n- 대안적 해결책';
      improved = true;
      improvements.push('고복잡도 작업 가이드 추가');
    }

    return { improved, prompt: result, improvements };
  }

  /**
   * 길이 최적화
   */
  private optimizeLength(prompt: string): string {
    // 너무 짧은 프롬프트 확장
    if (prompt.length < 50) {
      return prompt + '\n\n구체적이고 실행 가능한 답변을 제공해주세요.';
    }

    // 너무 긴 프롬프트 요약
    if (prompt.length > 500) {
      const lines = prompt.split('\n');
      const essential = lines.slice(0, 5).join('\n');
      const summary = '\n\n핵심 요구사항에 집중하여 답변해주세요.';
      return essential + summary;
    }

    return prompt;
  }

  /**
   * 성공 패턴 학습
   */
  async learnFromSuccessfulInteractions(
    interactions: Array<{
      prompt: string;
      response: string;
      qualityScore: number;
      category?: string;
    }>
  ): Promise<void> {
    const highQualityInteractions = interactions.filter(i => i.qualityScore >= 0.8);

    for (const interaction of highQualityInteractions) {
      const patterns = this.extractPatterns(interaction.prompt);
      const category = interaction.category || 'general';

      if (!this.successfulPatterns.has(category)) {
        this.successfulPatterns.set(category, []);
      }

      this.successfulPatterns.get(category)!.push(...patterns);
    }

    // 패턴 중복 제거 및 정렬
    for (const [category, patterns] of this.successfulPatterns) {
      const uniquePatterns = [...new Set(patterns)];
      this.successfulPatterns.set(category, uniquePatterns);
    }
  }

  /**
   * 템플릿 생성
   */
  async createTemplate(
    template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'performance'>
  ): Promise<PromptTemplate> {
    const newTemplate: PromptTemplate = {
      ...template,
      id: this.generateTemplateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      performance: {
        usageCount: 0,
        avgQualityScore: 0,
        avgResponseTime: 0,
        successRate: 0
      }
    };

    // DB 저장
    await prisma.promptTemplate.create({
      data: {
        id: newTemplate.id,
        name: newTemplate.name,
        category: newTemplate.category,
        language: newTemplate.language,
        template: newTemplate.template,
        variables: newTemplate.variables,
        examples: JSON.stringify(newTemplate.examples),
        isActive: newTemplate.isActive
      }
    });

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * 템플릿 성능 업데이트
   */
  async updateTemplatePerformance(
    templateId: string,
    metrics: {
      qualityScore: number;
      responseTime: number;
      success: boolean;
    }
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) return;

    // 성능 메트릭 업데이트
    const perf = template.performance!;
    const newCount = perf.usageCount + 1;
    
    perf.avgQualityScore = (perf.avgQualityScore * perf.usageCount + metrics.qualityScore) / newCount;
    perf.avgResponseTime = (perf.avgResponseTime * perf.usageCount + metrics.responseTime) / newCount;
    perf.successRate = (perf.successRate * perf.usageCount + (metrics.success ? 1 : 0)) / newCount;
    perf.usageCount = newCount;

    // DB 업데이트
    await prisma.promptTemplate.update({
      where: { id: templateId },
      data: {
        performance: JSON.stringify(perf),
        updatedAt: new Date()
      }
    });
  }

  /**
   * 유틸리티 함수들
   */
  private calculateTemplateSimilarity(prompt: string, template: PromptTemplate): number {
    // 간단한 코사인 유사도 계산 (실제로는 더 정교한 방법 사용)
    const promptWords = new Set(prompt.toLowerCase().split(/\s+/));
    const templateWords = new Set(template.template.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...promptWords].filter(x => templateWords.has(x)));
    const union = new Set([...promptWords, ...templateWords]);
    
    return intersection.size / union.size;
  }

  private extractVariables(prompt: string, variableNames: string[]): Record<string, string> {
    const extracted: Record<string, string> = {};
    
    // 간단한 추출 로직 (실제로는 NLP 사용)
    for (const varName of variableNames) {
      if (varName === 'question') {
        extracted[varName] = prompt;
      } else if (varName === 'context') {
        extracted[varName] = 'Excel 분석';
      }
    }
    
    return extracted;
  }

  private extractPatterns(prompt: string): string[] {
    const patterns: string[] = [];
    
    // 구조 패턴 추출
    if (prompt.includes('\n')) {
      patterns.push('multiline_structure');
    }
    if (/\d+\./.test(prompt)) {
      patterns.push('numbered_list');
    }
    if (prompt.includes('?')) {
      patterns.push('question_format');
    }
    
    return patterns;
  }

  private shouldApplyPattern(prompt: string, pattern: string): boolean {
    // 패턴 적용 여부 결정
    switch (pattern) {
      case 'multiline_structure':
        return !prompt.includes('\n') && prompt.length > 100;
      case 'numbered_list':
        return !/\d+\./.test(prompt) && prompt.split(/[.!?]/).length > 3;
      default:
        return false;
    }
  }

  private applySuccessPattern(prompt: string, pattern: string): string {
    switch (pattern) {
      case 'multiline_structure':
        return prompt.replace(/\. /g, '.\n');
      case 'numbered_list':
        const sentences = prompt.split(/[.!?]/).filter(s => s.trim());
        return sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
      default:
        return prompt;
    }
  }

  private calculateExpectedImprovement(
    original: string,
    optimized: string,
    improvementCount: number
  ): number {
    // 개선 정도 예측
    const lengthImprovement = Math.abs(optimized.length - 200) < Math.abs(original.length - 200) ? 0.1 : 0;
    const structureImprovement = (optimized.includes('\n') && !original.includes('\n')) ? 0.2 : 0;
    const improvementBonus = Math.min(improvementCount * 0.1, 0.3);
    
    return Math.min(lengthImprovement + structureImprovement + improvementBonus, 0.5);
  }

  private async getSuccessfulPatterns(category: string): Promise<string[]> {
    return this.successfulPatterns.get(category) || [];
  }

  private generateTemplateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadTemplates(): Promise<void> {
    // 기본 템플릿 로드 (실제로는 DB에서)
    const defaultTemplates: Partial<PromptTemplate>[] = [
      {
        name: 'Excel 오류 분석 구조화',
        category: 'error_analysis',
        language: 'ko',
        template: `Excel 파일에서 {{question}}

다음 형식으로 분석해주세요:

1. 오류 유형 및 위치
   - 오류 코드/메시지:
   - 발생 위치 (셀/범위):
   
2. 오류 원인 분석
   - 직접적 원인:
   - 근본 원인:
   
3. 해결 방법
   - 즉시 적용 가능한 해결책:
   - 단계별 실행 방법:
   
4. 예방 조치
   - 향후 방지 방법:
   - 권장 사항:`,
        variables: ['question'],
        isActive: true
      },
      {
        name: '수식 도움말 템플릿',
        category: 'formula_help',
        language: 'ko',
        template: `사용자 요구사항: {{question}}

Excel 수식 전문가로서 다음을 제공해주세요:

1. 추천 수식
   \`\`\`
   {{formula}}
   \`\`\`

2. 수식 설명
   - 각 부분의 역할:
   - 작동 원리:

3. 사용 예시
   - 샘플 데이터:
   - 예상 결과:

4. 주의사항 및 대안
   - 흔한 실수:
   - 대체 수식:`,
        variables: ['question', 'formula'],
        isActive: true
      }
    ];

    // 템플릿 초기화
    for (const template of defaultTemplates) {
      const fullTemplate = await this.createTemplate(template as any);
      this.templates.set(fullTemplate.id, fullTemplate);
    }
  }
}

// 프롬프트 최적화 헬퍼 함수들
export const promptHelpers = {
  /**
   * 카테고리별 최적 프롬프트 생성
   */
  async generateOptimalPrompt(
    userInput: string,
    category: string,
    optimizer: PromptOptimizer
  ): Promise<string> {
    const result = await optimizer.optimizePrompt(userInput, { category });
    return result.optimizedPrompt;
  },

  /**
   * 일반적인 Excel 질문 템플릿
   */
  excelQuestionTemplates: {
    errorAnalysis: (error: string, location: string) => 
      `Excel 파일의 ${location}에서 "${error}" 오류가 발생했습니다. 원인과 해결 방법을 알려주세요.`,
    
    formulaHelp: (task: string) =>
      `${task}을(를) 수행하는 Excel 수식을 작성해주세요. 단계별 설명과 예시를 포함해주세요.`,
    
    dataValidation: (data: string, requirement: string) =>
      `다음 데이터를 검증해주세요:\n${data}\n\n요구사항: ${requirement}`,
    
    chartAnalysis: (chartType: string, issue: string) =>
      `${chartType} 차트에서 ${issue} 문제가 있습니다. 개선 방안을 제시해주세요.`
  }
};