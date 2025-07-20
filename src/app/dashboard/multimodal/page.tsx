import type { Metadata } from 'next'
import { ImageBasedChat } from '@/components/multimodal/ImageBasedChat'

export const metadata: Metadata = {
  title: "이미지 기반 Excel 분석",
  description: "Excel 스크린샷이나 차트 이미지를 업로드하여 AI가 분석하고 개선 방안을 제시받으세요. 멀티모달 AI로 시각적 데이터도 처리합니다.",
  keywords: ["이미지 분석", "Excel 스크린샷", "차트 분석", "멀티모달 AI", "시각적 분석"],
  openGraph: {
    title: "이미지 기반 Excel 분석 | Exhell",
    description: "Excel 스크린샷이나 차트 이미지를 AI가 분석하고 개선 방안을 제시합니다.",
    url: '/dashboard/multimodal',
  },
}

export default function MultimodalAnalysisPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">이미지 기반 Excel 분석</h1>
        <p className="text-muted-foreground mt-2">
          Excel 스크린샷이나 차트 이미지를 업로드하여 AI가 분석하고 개선 방안을 제시받으세요
        </p>
      </div>
      
      <ImageBasedChat />
    </div>
  )
}