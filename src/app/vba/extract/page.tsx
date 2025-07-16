import { VBAExtractionDashboard } from '@/components/vba/VBAExtractionDashboard'

export default function VBAExtractPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">VBA 코드 추출</h1>
        <p className="text-muted-foreground mt-2">
          Excel 파일에서 VBA 매크로를 추출하고 보안 위험을 분석합니다
        </p>
      </div>
      
      <VBAExtractionDashboard />
    </div>
  )
}