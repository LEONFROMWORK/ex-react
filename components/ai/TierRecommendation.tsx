'use client';

import { useState } from 'react';
import { Sparkles, Zap, DollarSign, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface TierOption {
  tier: 'TIER1' | 'TIER2' | 'TIER3';
  name: string;
  description: string;
  price: string;
  features: string[];
  limitations?: string[];
  icon: React.ReactNode;
  color: string;
}

interface TierRecommendationProps {
  recommendedTier: 'TIER1' | 'TIER2' | 'TIER3';
  confidence: number;
  reasons: string[];
  alternativeTiers: Array<{
    tier: 'TIER1' | 'TIER2' | 'TIER3';
    tradeoffs: string[];
  }>;
  onTierSelect: (tier: 'TIER1' | 'TIER2' | 'TIER3') => void;
  estimatedCost?: {
    estimatedCost: number;
    breakdown: {
      textAnalysis: number;
      imageAnalysis: number;
      total: number;
    };
  };
}

const tierOptions: Record<string, TierOption> = {
  TIER1: {
    tier: 'TIER1',
    name: '기본 분석',
    description: '간단한 Excel 오류 감지 및 기본 분석',
    price: '$0.002/1K 토큰',
    features: [
      '기본 수식 오류 감지',
      '간단한 데이터 검증',
      '빠른 응답 속도',
      '비용 효율적'
    ],
    limitations: [
      '이미지 분석 불가',
      '복잡한 수식 제한'
    ],
    icon: <Zap className="w-5 h-5" />,
    color: 'text-blue-600 bg-blue-50'
  },
  TIER2: {
    tier: 'TIER2',
    name: '고급 분석',
    description: '복잡한 Excel 분석 및 상세 진단',
    price: '$0.03/1K 토큰',
    features: [
      '복잡한 수식 분석',
      '상세 오류 진단',
      '데이터 패턴 인식',
      '개선 제안'
    ],
    limitations: [
      '제한적 이미지 분석'
    ],
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-purple-600 bg-purple-50'
  },
  TIER3: {
    tier: 'TIER3',
    name: '프리미엄 분석',
    description: 'Excel + 이미지 통합 분석 및 고급 인사이트',
    price: '$0.05/1K 토큰',
    features: [
      '완벽한 이미지 분석',
      '시각적 비교 분석',
      '고급 추론 및 인사이트',
      '맞춤형 개선 방안',
      '최고 정확도'
    ],
    icon: <DollarSign className="w-5 h-5" />,
    color: 'text-green-600 bg-green-50'
  }
};

export function TierRecommendation({
  recommendedTier,
  confidence,
  reasons,
  alternativeTiers,
  onTierSelect,
  estimatedCost
}: TierRecommendationProps) {
  const [selectedTier, setSelectedTier] = useState(recommendedTier);
  const [showDetails, setShowDetails] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const handleTierChange = (tier: string) => {
    setSelectedTier(tier as 'TIER1' | 'TIER2' | 'TIER3');
    onTierSelect(tier as 'TIER1' | 'TIER2' | 'TIER3');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          AI 분석 티어 선택
          <Badge variant="outline" className="ml-2">
            추천 신뢰도 {(confidence * 100).toFixed(0)}%
          </Badge>
        </CardTitle>
        <CardDescription>
          분석 요구사항에 따라 최적의 AI 모델을 자동으로 추천해드립니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 추천 이유 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 mb-1">
                {tierOptions[recommendedTier].name} 추천 이유
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                {reasons.slice(0, 3).map((reason, idx) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
              {reasons.length > 3 && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-blue-600 p-0 h-auto mt-1"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? '간략히' : `${reasons.length - 3}개 더 보기`}
                </Button>
              )}
              <Collapsible open={showDetails}>
                <CollapsibleContent>
                  <ul className="text-sm text-blue-800 space-y-1 mt-2">
                    {reasons.slice(3).map((reason, idx) => (
                      <li key={idx + 3}>• {reason}</li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>

        {/* 티어 선택 */}
        <RadioGroup value={selectedTier} onValueChange={handleTierChange}>
          <div className="space-y-3">
            {Object.values(tierOptions).map((option) => (
              <label
                key={option.tier}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  selectedTier === option.tier
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <RadioGroupItem value={option.tier} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("p-1.5 rounded-md", option.color)}>
                      {option.icon}
                    </div>
                    <span className="font-semibold">{option.name}</span>
                    {option.tier === recommendedTier && (
                      <Badge variant="default" className="text-xs">추천</Badge>
                    )}
                    <span className="text-sm text-gray-500 ml-auto">{option.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {option.features.slice(0, 3).map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {option.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{option.features.length - 3}
                      </Badge>
                    )}
                  </div>
                  {option.limitations && option.limitations.length > 0 && (
                    <div className="mt-2">
                      {option.limitations.map((limitation, idx) => (
                        <p key={idx} className="text-xs text-red-600">
                          ⚠️ {limitation}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </RadioGroup>

        {/* 예상 비용 */}
        {estimatedCost && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold mb-2">예상 비용</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">텍스트 분석</span>
                <span>${estimatedCost.breakdown.textAnalysis.toFixed(4)}</span>
              </div>
              {estimatedCost.breakdown.imageAnalysis > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">이미지 분석</span>
                  <span>${estimatedCost.breakdown.imageAnalysis.toFixed(4)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>총 예상 비용</span>
                <span>${estimatedCost.breakdown.total.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 대안 티어 */}
        <Collapsible open={showAlternatives} onOpenChange={setShowAlternatives}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <span>다른 옵션 비교</span>
              {showAlternatives ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3">
            {alternativeTiers.map(({ tier, tradeoffs }) => (
              <Card key={tier} className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  {tierOptions[tier].icon}
                  {tierOptions[tier].name}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {tradeoffs.map((tradeoff, idx) => (
                    <p
                      key={idx}
                      className={cn(
                        "flex items-start gap-1",
                        tradeoff.startsWith('✅') ? 'text-green-700' : 'text-red-700'
                      )}
                    >
                      {tradeoff}
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}