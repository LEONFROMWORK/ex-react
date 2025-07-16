// Health check endpoint
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Dynamic import to avoid build-time initialization issues
    const { excelAnalysisAPI } = await import('@/Features/excel-analysis/api/excel-analysis.api')
    return await excelAnalysisAPI.healthCheck(request)
  } catch (error) {
    console.error('Health check route error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    )
  }
}