// API Layer - Excel Analysis Feature
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ExcelAnalysisModule } from '../excel-analysis.module'
import { withAuth } from '@/Features/shared/middleware/auth.middleware'
import { withValidation } from '@/Features/shared/middleware/validation.middleware'
import { withErrorHandler } from '@/Features/shared/middleware/error.middleware'

// Request/Response schemas
const analyzeRequestSchema = z.object({
  mode: z.literal('file'),
  file: z.instanceof(File)
})

const analyzeResponseSchema = z.object({
  success: z.boolean(),
  analysisId: z.string().optional(),
  results: z.any().optional(),
  error: z.string().optional()
})

// API Routes for Excel Analysis
export class ExcelAnalysisAPI {
  private module: ExcelAnalysisModule
  
  constructor() {
    this.module = ExcelAnalysisModule.getInstance()
  }
  
  // POST /api/features/excel-analysis/analyze
  analyze = withErrorHandler(
    withAuth(
      withValidation(analyzeRequestSchema)(
        async (req: NextRequest, session: any) => {
          const formData = await req.formData()
          const file = formData.get('file') as File
          
          if (!file) {
            return NextResponse.json(
              { success: false, error: 'No file provided' },
              { status: 400 }
            )
          }
          
          const buffer = Buffer.from(await file.arrayBuffer())
          const result = await this.module.analyzeFile(buffer, session.user.id)
          
          return NextResponse.json({
            success: true,
            analysisId: result.id,
            results: result
          })
        }
      )
    )
  )
  
  // GET /api/features/excel-analysis/history
  getHistory = withErrorHandler(
    withAuth(
      async (req: NextRequest, session: any) => {
        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '10')
        
        const history = await this.module.getAnalysisHistory(session.user.id, limit)
        
        return NextResponse.json({
          success: true,
          history
        })
      }
    )
  )
  
  // GET /api/features/excel-analysis/:id
  getAnalysis = withErrorHandler(
    withAuth(
      async (req: NextRequest, session: any, { params }: any) => {
        const analysis = await this.module.getAnalysisById(params.id, session.user.id)
        
        if (!analysis) {
          return NextResponse.json(
            { success: false, error: 'Analysis not found' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({
          success: true,
          analysis
        })
      }
    )
  )
  
  // GET /api/features/excel-analysis/health
  healthCheck = async (req: NextRequest) => {
    try {
      const health = await this.module.healthCheck()
      return NextResponse.json(health)
    } catch (error) {
      console.error('Health check error:', error)
      return NextResponse.json(
        { status: 'error', message: 'Health check failed' },
        { status: 500 }
      )
    }
  }
}

// Export singleton instance
export const excelAnalysisAPI = new ExcelAnalysisAPI()