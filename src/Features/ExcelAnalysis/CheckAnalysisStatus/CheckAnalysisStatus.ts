import { z } from "zod"
import { Result } from "@/Common/Result"
import { ExcelErrors } from "@/Common/Errors"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class CheckAnalysisStatus {
  static readonly Request = z.object({
    fileId: z.string(),
    userId: z.string(),
  })

  static readonly Response = z.object({
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
    progress: z.number().min(0).max(100),
    currentStep: z.string().optional(),
    result: z.object({
      totalErrors: z.number(),
      correctedErrors: z.number(),
      analysisId: z.string(),
    }).optional(),
    error: z.string().optional(),
    aiTier: z.enum(["TIER1", "TIER2"]).optional(),
    estimatedCost: z.number().optional(),
  })
}

export type CheckAnalysisStatusRequest = z.infer<typeof CheckAnalysisStatus.Request>
export type CheckAnalysisStatusResponse = z.infer<typeof CheckAnalysisStatus.Response>

// Validator
export class CheckAnalysisStatusValidator {
  static validate(request: unknown): Result<CheckAnalysisStatusRequest> {
    try {
      const validated = CheckAnalysisStatus.Request.parse(request)
      return Result.success(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: "VALIDATION_ERROR",
          message: error.errors.map(e => e.message).join(", "),
        })
      }
      return Result.failure(ExcelErrors.InvalidRequest)
    }
  }
}

// Handler
export class CheckAnalysisStatusHandler {
  async handle(request: CheckAnalysisStatusRequest): Promise<Result<CheckAnalysisStatusResponse>> {
    try {
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

      if (!file) {
        return Result.failure(ExcelErrors.FileNotFound)
      }

      // Calculate progress based on status
      let progress = 0
      let currentStep = ""
      
      switch (file.status) {
        case "PENDING":
          progress = 0
          currentStep = "대기 중"
          break
        case "PROCESSING":
          progress = 50
          currentStep = "분석 중"
          break
        case "COMPLETED":
          progress = 100
          currentStep = "완료"
          break
        case "FAILED":
          progress = 0
          currentStep = "실패"
          break
      }

      const response: CheckAnalysisStatusResponse = {
        status: file.status,
        progress,
        currentStep,
      }

      // Add analysis results if completed
      if (file.status === "COMPLETED" && file.analyses[0]) {
        const analysis = file.analyses[0]
        response.result = {
          totalErrors: (analysis.report as any).totalErrors || 0,
          correctedErrors: (analysis.report as any).correctedErrors || 0,
          analysisId: analysis.id,
        }
        response.aiTier = analysis.aiTier
        response.estimatedCost = analysis.estimatedCost
      }

      // Add error message if failed
      if (file.status === "FAILED") {
        response.error = "파일 분석 중 오류가 발생했습니다."
      }

      return Result.success(response)
    } catch (error) {
      console.error("Status check error:", error)
      return Result.failure(ExcelErrors.ProcessingFailed)
    }
  }
}