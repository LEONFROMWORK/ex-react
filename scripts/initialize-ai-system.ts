#!/usr/bin/env node

/**
 * AI 시스템 초기화 스크립트
 * 새로운 AI 시스템을 설정하고 기본 데이터를 생성합니다.
 * 
 * 사용법: npx ts-node scripts/initialize-ai-system.ts
 */

import { prisma } from '@/lib/prisma';
import { initializeAISystem } from '@/lib/ai';
import { AIModelManager } from '@/lib/ai/model-manager';

async function main() {
  console.log('🚀 AI 시스템 초기화 시작...\n');

  try {
    // 1. 기본 AI 모델 설정 생성
    console.log('📋 기본 AI 모델 설정 생성 중...');
    
    const defaultModels = [
      {
        provider: 'openrouter',
        modelName: 'deepseek/deepseek-chat',
        displayName: 'DeepSeek Chat (경제적)',
        description: '비용 효율적인 기본 채팅 모델',
        isActive: true,
        isDefault: true,
        priority: 1,
        taskTypes: ['chat', 'general'],
        maxTokens: 2000,
        temperature: 0.7,
        costPerCredit: 0.0001,
        tier: 'TIER1'
      },
      {
        provider: 'openrouter',
        modelName: 'google/gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        description: '빠른 멀티모달 분석',
        isActive: true,
        isDefault: false,
        priority: 2,
        taskTypes: ['vision', 'analysis'],
        maxTokens: 8192,
        temperature: 0.7,
        costPerCredit: 0.00035,
        tier: 'TIER1'
      },
      {
        provider: 'openrouter',
        modelName: 'openai/gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        description: '균형잡힌 성능의 범용 모델',
        isActive: true,
        isDefault: false,
        priority: 3,
        taskTypes: ['chat', 'analysis'],
        maxTokens: 4096,
        temperature: 0.7,
        costPerCredit: 0.0015,
        tier: 'TIER2'
      },
      {
        provider: 'openrouter',
        modelName: 'anthropic/claude-3-haiku',
        displayName: 'Claude 3 Haiku',
        description: '빠르고 효율적인 Claude 모델',
        isActive: true,
        isDefault: false,
        priority: 4,
        taskTypes: ['chat', 'vision', 'analysis'],
        maxTokens: 4096,
        temperature: 0.7,
        costPerCredit: 0.00025,
        tier: 'TIER2'
      },
      {
        provider: 'openrouter',
        modelName: 'openai/gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        description: '최고 성능의 텍스트 분석',
        isActive: true,
        isDefault: false,
        priority: 5,
        taskTypes: ['chat', 'analysis'],
        maxTokens: 128000,
        temperature: 0.7,
        costPerCredit: 0.01,
        tier: 'TIER3'
      },
      {
        provider: 'openrouter',
        modelName: 'openai/gpt-4o',
        displayName: 'GPT-4o',
        description: '최신 멀티모달 플래그십 모델',
        isActive: true,
        isDefault: false,
        priority: 6,
        taskTypes: ['vision', 'analysis'],
        maxTokens: 128000,
        temperature: 0.7,
        costPerCredit: 0.005,
        tier: 'TIER3'
      }
    ];

    for (const model of defaultModels) {
      const apiKey = process.env.OPENROUTER_API_KEY || '';
      const encryptedKey = AIModelManager.encryptApiKey(apiKey);
      
      await prisma.aIModelConfig.upsert({
        where: { modelName: model.modelName },
        update: model,
        create: {
          ...model,
          apiKey: encryptedKey
        }
      });
    }
    
    console.log(`✅ ${defaultModels.length}개의 AI 모델 설정 완료\n`);

    // 2. 라우팅 정책 생성
    console.log('🔀 라우팅 정책 생성 중...');
    
    await prisma.aIModelPolicy.upsert({
      where: { name: 'routing-config' },
      update: {
        isActive: true,
        rules: {
          enableFallback: true,
          fallbackStrategy: 'similar-capability',
          maxRetries: 3,
          costThreshold: 0.01,
          enableCostOptimization: true,
          providerPriority: ['openrouter', 'openai', 'anthropic', 'google'],
          blacklistedModels: [],
          monitoring: {
            alertOnFailure: true,
            alertThreshold: 5
          }
        }
      },
      create: {
        name: 'routing-config',
        description: '동적 모델 라우팅 설정',
        isActive: true,
        rules: {
          enableFallback: true,
          fallbackStrategy: 'similar-capability',
          maxRetries: 3,
          costThreshold: 0.01,
          enableCostOptimization: true,
          providerPriority: ['openrouter', 'openai', 'anthropic', 'google'],
          blacklistedModels: [],
          monitoring: {
            alertOnFailure: true,
            alertThreshold: 5
          }
        }
      }
    });
    
    console.log('✅ 라우팅 정책 생성 완료\n');

    // 3. 기본 프롬프트 템플릿 생성
    console.log('📝 기본 프롬프트 템플릿 생성 중...');
    
    const templates = [
      {
        name: 'Excel 오류 분석 (한국어)',
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
        name: '수식 도움말 (한국어)',
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

    for (const template of templates) {
      await prisma.promptTemplate.create({
        data: {
          ...template,
          examples: JSON.stringify({}),
          performance: JSON.stringify({
            usageCount: 0,
            avgQualityScore: 0,
            avgResponseTime: 0,
            successRate: 0
          })
        }
      });
    }
    
    console.log(`✅ ${templates.length}개의 프롬프트 템플릿 생성 완료\n`);

    // 4. AI 시스템 초기화
    console.log('🎯 AI 시스템 초기화 중...');
    await initializeAISystem();
    console.log('✅ AI 시스템 초기화 완료\n');

    // 5. 테스트 실험 생성 (A/B 테스팅이 활성화된 경우)
    if (process.env.ENABLE_AB_TESTING === 'true') {
      console.log('🧪 테스트 A/B 실험 생성 중...');
      
      const experiment = await prisma.experiment.create({
        data: {
          name: '초기 모델 성능 비교',
          description: 'DeepSeek vs GPT-3.5 Turbo 성능 비교',
          status: 'active',
          type: 'model',
          variants: JSON.stringify([
            {
              id: 'control',
              name: 'DeepSeek (Control)',
              allocation: 50,
              config: { model: 'deepseek/deepseek-chat' }
            },
            {
              id: 'test',
              name: 'GPT-3.5 Turbo (Test)',
              allocation: 50,
              config: { model: 'openai/gpt-3.5-turbo' }
            }
          ]),
          metrics: ['conversionRate', 'qualityScore', 'responseTime', 'cost'],
          targetAudience: JSON.stringify({ tierRestriction: ['TIER1', 'TIER2'] }),
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2주
        }
      });
      
      console.log(`✅ A/B 테스트 실험 생성 완료: ${experiment.name}\n`);
    }

    // 6. 시스템 상태 확인
    console.log('🔍 시스템 상태 확인 중...');
    
    const modelCount = await prisma.aIModelConfig.count({ where: { isActive: true } });
    const policyCount = await prisma.aIModelPolicy.count({ where: { isActive: true } });
    const templateCount = await prisma.promptTemplate.count({ where: { isActive: true } });
    const experimentCount = await prisma.experiment.count({ where: { status: 'active' } });
    
    console.log(`
📊 시스템 상태:
- 활성 AI 모델: ${modelCount}개
- 활성 정책: ${policyCount}개
- 프롬프트 템플릿: ${templateCount}개
- 진행중인 실험: ${experimentCount}개
`);

    console.log('✨ AI 시스템 초기화가 성공적으로 완료되었습니다!\n');
    console.log('다음 단계:');
    console.log('1. npm run dev로 개발 서버 시작');
    console.log('2. /api/ai/analyze 엔드포인트로 분석 요청');
    console.log('3. /api/ai/dashboard로 관리자 대시보드 확인');
    
  } catch (error) {
    console.error('❌ 초기화 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
main().catch((error) => {
  console.error('❌ 스크립트 실행 실패:', error);
  process.exit(1);
});