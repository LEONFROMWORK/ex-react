import type { Metadata } from 'next'
import { VBAAutoCorrection } from '@/components/vba/VBAAutoCorrection'

export const metadata: Metadata = {
  title: "VBA 자동 수정",
  description: "Excel VBA 코드의 오류를 AI가 자동으로 감지하고 수정합니다. 보안, 성능, 호환성 문제를 한 번에 해결하세요.",
  keywords: ["VBA 수정", "VBA 오류", "Excel 매크로", "코드 최적화", "자동 수정"],
  openGraph: {
    title: "VBA 자동 수정 도구 | Exhell",
    description: "Excel VBA 코드의 오류를 AI가 자동으로 감지하고 수정합니다.",
    url: '/vba/auto-correct',
  },
}

export default function VBAAutoCorrectionPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">VBA 자동 수정</h1>
        <p className="text-muted-foreground mt-2">
          Excel VBA 코드의 오류를 자동으로 감지하고 수정하여 안전하고 효율적인 코드로 개선합니다
        </p>
      </div>
      
      <VBAAutoCorrection />
    </div>
  )
}