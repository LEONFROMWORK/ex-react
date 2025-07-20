import type { Metadata } from 'next'
import { ExcelAnalyzer } from '@/components/excel-analyzer/ExcelAnalyzer'
import { FAQSection } from '@/components/home/FAQSection'

export const metadata: Metadata = {
  title: "Excel 분석 도구",
  description: "AI를 활용한 Excel 파일 분석 도구입니다. 오류 감지, 성능 최적화, VBA 분석 등 다양한 기능을 무료로 체험해보세요.",
  keywords: ["Excel 도구", "파일 분석", "AI 분석", "오류 감지", "데이터 처리"],
  openGraph: {
    title: "Excel 분석 도구 | Exhell",
    description: "AI를 활용한 Excel 파일 분석 도구로 오류를 감지하고 최적화하세요.",
    url: '/tools',
  },
}

export default function ToolsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold dark:text-white">Excel 분석 도구</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Excel 파일을 업로드하거나 질문을 통해 AI 분석을 받아보세요
        </p>
      </div>
      
      {/* Excel Analyzer Tool */}
      <ExcelAnalyzer />
      
      {/* FAQ Section */}
      <div className="mt-12">
        <FAQSection />
      </div>
    </div>
  )
}