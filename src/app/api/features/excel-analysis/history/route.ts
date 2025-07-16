// API Route for analysis history
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { excelAnalysisAPI } = await import('@/Features/excel-analysis/api/excel-analysis.api')
  return await excelAnalysisAPI.getHistory(request)
}