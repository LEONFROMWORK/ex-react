import type { Metadata } from 'next'
import { ExcelAnalyzer } from '@/components/excel-analyzer/ExcelAnalyzer'

export const metadata: Metadata = {
  title: "Excel 파일 분석기",
  description: "AI를 활용한 Excel 파일 분석 도구. 오류 감지, 데이터 검증, 수식 분석 등 다양한 기능을 제공합니다.",
  keywords: ["Excel 분석", "파일 분석", "AI 분석", "오류 감지", "데이터 검증"],
  openGraph: {
    title: "Excel 파일 분석기 | Exhell",
    description: "AI를 활용한 Excel 파일 분석으로 오류를 감지하고 데이터를 검증하세요.",
    url: '/excel-analyzer',
  },
}

export default function ExcelAnalyzerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold dark:text-white mb-4">Excel 파일 분석기</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Excel 파일을 업로드하여 AI 기반 종합 분석을 받아보세요
        </p>
      </div>
      
      <ExcelAnalyzer />
    </div>
  )
}