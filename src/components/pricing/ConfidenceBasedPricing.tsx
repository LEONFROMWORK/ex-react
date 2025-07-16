import React from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PricingTier {
  name: string
  price: string
  description: string
  features: string[]
  limitations: string[]
  badge?: string
  popular?: boolean
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '₩0',
    description: '가벼운 Excel 사용자를 위한 무료 플랜',
    features: [
      '일일 3회 분석',
      '기본 오류 감지',
      '해결 못해도 비용 없음',
      '커뮤니티 지원'
    ],
    limitations: [
      'VBA 분석 제외',
      '분석 이력 저장 안됨',
      '광고 표시'
    ]
  },
  {
    name: 'Smart',
    price: '₩19,900',
    description: '해결한 만큼만 비용을 내는 공정한 플랜',
    features: [
      '월 100회 분석',
      '✅ 완전 해결 시에만 과금',
      '⚡ 부분 해결은 50% 할인',
      '❌ 미해결은 전액 환불',
      'VBA 기본 분석',
      '분석 이력 30일 저장',
      '우선 처리'
    ],
    limitations: [
      'API 액세스 불가',
      '팀 공유 불가'
    ],
    badge: '추천',
    popular: true
  },
  {
    name: 'Business',
    price: '₩49,900',
    description: '팀과 기업을 위한 무제한 플랜',
    features: [
      '무제한 분석',
      '30일 무조건 환불 보장',
      '팀 5명까지 사용',
      'API 액세스',
      'VBA 심화 분석',
      '전담 지원',
      'SLA 보장 (24시간 내 응답)'
    ],
    limitations: []
  }
]

const confidenceLevels = [
  { range: '90-100%', label: '확실히 해결', color: 'bg-green-500', examples: ['순환 참조', '#N/A 오류', '데이터 형식'] },
  { range: '50-89%', label: '부분 해결', color: 'bg-yellow-500', examples: ['복잡한 수식', 'VBA 분석', '피벗 테이블'] },
  { range: '0-49%', label: '해결 어려움', color: 'bg-red-500', examples: ['이미지 분석', '실시간 협업', '외부 연결'] }
]

export function ConfidenceBasedPricing() {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">투명하고 공정한 가격</h2>
        <p className="text-xl text-muted-foreground mb-8">
          해결하지 못하면 비용을 받지 않습니다
        </p>
        
        {/* 신뢰도 레벨 표시 */}
        <div className="max-w-4xl mx-auto mb-12">
          <h3 className="text-lg font-semibold mb-4">우리의 해결 능력을 투명하게 공개합니다</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {confidenceLevels.map((level) => (
              <Card key={level.range} className="text-left">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${level.color}`} />
                    <CardTitle className="text-base">{level.label}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="w-fit">{level.range}</Badge>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {level.examples.map((example, idx) => (
                      <li key={idx}>• {example}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* 가격 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {pricingTiers.map((tier) => (
          <Card 
            key={tier.name} 
            className={`relative ${tier.popular ? 'border-primary shadow-lg' : ''}`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  {tier.badge}
                </Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground">/월</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
              {tier.limitations.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  {tier.limitations.map((limitation, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{limitation}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full" 
                variant={tier.popular ? 'default' : 'outline'}
              >
                {tier.price === '₩0' ? '무료로 시작하기' : '14일 무료 체험'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 환불 정책 */}
      <Card className="max-w-4xl mx-auto mt-12 bg-muted/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            업계 최초 성과 기반 환불 정책
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl mb-2">✅</div>
              <h4 className="font-semibold mb-1">완전 해결</h4>
              <p className="text-sm text-muted-foreground">정상 과금</p>
            </div>
            <div>
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-semibold mb-1">부분 해결</h4>
              <p className="text-sm text-muted-foreground">50% 할인 또는 크레딧</p>
            </div>
            <div>
              <div className="text-2xl mb-2">❌</div>
              <h4 className="font-semibold mb-1">미해결</h4>
              <p className="text-sm text-muted-foreground">100% 환불</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 신뢰 메시지 */}
      <div className="text-center mt-12 max-w-2xl mx-auto">
        <p className="text-muted-foreground">
          &quot;우리는 모든 Excel 문제를 해결할 수 없다는 것을 알고 있습니다.&quot;<br />
          &quot;하지만 정직하게 노력하고, 공정하게 과금하겠습니다.&quot;<br />
          &quot;여러분의 신뢰가 우리의 가장 큰 자산입니다.&quot;
        </p>
      </div>
    </div>
  )
}