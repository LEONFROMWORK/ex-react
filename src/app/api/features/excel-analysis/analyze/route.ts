// New API Route using Vertical Slice Architecture
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { excelAnalysisAPI } = await import('@/Features/excel-analysis/api/excel-analysis.api')
  return await excelAnalysisAPI.analyze(request)
}