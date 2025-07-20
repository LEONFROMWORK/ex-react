import { z } from "zod"
import { Result } from "@/Common/Result"
import { ExcelErrors } from "@/Common/Errors"
import { prisma } from "@/lib/prisma"
import { EnhancedExcelAnalyzer } from "@/lib/excel/analyzer-enhanced"
import { join } from "path"
import ExcelJS from "exceljs"

// Request/Response types
export class DownloadCorrectedFile {
  static readonly Request = z.object({
    fileId: z.string(),
    userId: z.string(),
    type: z.enum(["corrected", "report", "package"]).default("corrected"),
  })

  static readonly Response = z.object({
    buffer: z.instanceof(Buffer),
    filename: z.string(),
    contentType: z.string(),
  })
}

export type DownloadCorrectedFileRequest = z.infer<typeof DownloadCorrectedFile.Request>
export type DownloadCorrectedFileResponse = z.infer<typeof DownloadCorrectedFile.Response>

// Validator
export class DownloadCorrectedFileValidator {
  static validate(request: unknown): Result<DownloadCorrectedFileRequest> {
    try {
      const validated = DownloadCorrectedFile.Request.parse(request)
      return Result.success(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: "VALIDATION_ERROR",
          message: error.errors.map(e => e.message).join(", "),
        })
      }
      return Result.failure(ExcelErrors.InvalidFormat)
    }
  }
}

// Handler
export class DownloadCorrectedFileHandler {
  constructor(
    private readonly analyzer: EnhancedExcelAnalyzer
  ) {}

  async handle(request: DownloadCorrectedFileRequest): Promise<Result<DownloadCorrectedFileResponse>> {
    try {
      // Get file and analysis
      const file = await prisma.file.findFirst({
        where: { 
          id: request.fileId, 
          userId: request.userId 
        },
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      if (!file || !file.analyses[0]) {
        return Result.failure(ExcelErrors.NotFound)
      }

      const analysis = file.analyses[0]

      switch (request.type) {
        case "report":
          return this.generateReport(file, analysis)
        
        case "corrected":
          return this.generateCorrectedFile(file, analysis)
        
        case "package":
          return this.generatePackage(file, analysis)
        
        default:
          return Result.failure({
            code: "INVALID_DOWNLOAD_TYPE",
            message: "잘못된 다운로드 유형입니다.",
          })
      }
    } catch (error) {
      console.error("Download error:", error)
      return Result.failure(ExcelErrors.ProcessingFailed)
    }
  }

  private async generateReport(file: any, analysis: any): Promise<Result<DownloadCorrectedFileResponse>> {
    const report = {
      fileName: file.originalName,
      analyzedAt: analysis.createdAt,
      totalErrors: (analysis.report as any).totalErrors,
      correctedErrors: (analysis.report as any).correctedErrors,
      confidence: analysis.confidence,
      aiTier: analysis.aiTier,
      errors: analysis.errors,
      insights: (analysis.report as any).aiInsights,
    }

    const buffer = Buffer.from(JSON.stringify(report, null, 2))
    
    return Result.success({
      buffer,
      filename: `report-${file.id}.json`,
      contentType: "application/json",
    })
  }

  private async generateCorrectedFile(file: any, analysis: any): Promise<Result<DownloadCorrectedFileResponse>> {
    const filePath = join(process.cwd(), "uploads", file.fileName)
    
    // Load and fix the file
    const analysisResult = await this.analyzer.analyzeFile(filePath)
    if (!analysisResult.success) {
      return Result.failure(ExcelErrors.ProcessingFailed)
    }

    const correctedWorkbook = await this.analyzer.fixErrors(analysis.corrections as any)
    const buffer = await this.analyzer.getWorkbookBuffer(correctedWorkbook)

    return Result.success({
      buffer,
      filename: `corrected-${file.originalName}`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  }

  private async generatePackage(file: any, analysis: any): Promise<Result<DownloadCorrectedFileResponse>> {
    // TODO: Implement package generation
    return Result.failure({
      code: "NOT_IMPLEMENTED",
      message: "Package download not yet implemented",
    })
  }
}