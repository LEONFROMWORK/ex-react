import { z } from "zod";
import { Result } from "@/Common/Result";
import { prisma } from "@/lib/prisma";
import { analyzeWithAI } from "@/lib/ai/analyzer";
import { ConsumeTokensHandler } from "@/Features/Billing/TokenManagement/ConsumeTokens";
import * as XLSX from "xlsx";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

// Request Schema
export const CorrectWithAIRequestSchema = z.object({
  fileId: z.string(),
  userId: z.string(),
  analysisId: z.string(),
  aiTier: z.enum(["auto", "economy", "premium"]).default("auto"),
  autoApply: z.boolean().default(true),
});

export type CorrectWithAIRequest = z.infer<typeof CorrectWithAIRequestSchema>;

// Response Type
export interface CorrectWithAIResponse {
  correctionId: string;
  fileId: string;
  correctedFileUrl?: string;
  totalErrors: number;
  correctedErrors: number;
  failedCorrections: number;
  successRate: number;
  tokensUsed: number;
  tokensCharged: number;
  partialSuccess: boolean;
  report: CorrectionReport;
}

export interface CorrectionReport {
  summary: string;
  corrections: Array<{
    location: string;
    original: any;
    corrected: any;
    status: "success" | "failed";
    reason?: string;
  }>;
  insights: string;
  aiTier: string;
  confidence: number;
}

// Handler
export class CorrectWithAIHandler {
  private consumeTokensHandler = new ConsumeTokensHandler();

  async handle(request: CorrectWithAIRequest): Promise<Result<CorrectWithAIResponse>> {
    try {
      // Get analysis data
      const analysis = await prisma.analysis.findUnique({
        where: { id: request.analysisId },
        include: { file: true }
      });

      if (!analysis || analysis.userId !== request.userId) {
        return Result.failure({
          code: "ANALYSIS_NOT_FOUND",
          message: "분석 결과를 찾을 수 없습니다."
        });
      }

      // Parse errors from analysis
      const errors = analysis.errors as any[];
      const totalErrors = errors.length;

      if (totalErrors === 0) {
        return Result.failure({
          code: "NO_ERRORS_FOUND",
          message: "수정할 오류가 없습니다."
        });
      }

      // Get AI corrections
      const aiResult = await analyzeWithAI(errors, request.aiTier);

      // Apply corrections if autoApply is true
      let correctedErrors = 0;
      let failedCorrections = 0;
      let correctedFileUrl: string | undefined;
      const correctionDetails: CorrectionReport["corrections"] = [];

      if (request.autoApply) {
        const correctionResult = await this.applyCorrections(
          analysis.file,
          aiResult.corrections,
          errors
        );
        
        correctedErrors = correctionResult.successCount;
        failedCorrections = correctionResult.failureCount;
        correctedFileUrl = correctionResult.correctedFileUrl;
        correctionDetails.push(...correctionResult.details);
      } else {
        // Just count potential corrections
        aiResult.corrections.forEach(correction => {
          if (correction.corrected) {
            correctedErrors++;
          } else {
            failedCorrections++;
          }
        });
      }

      // Calculate success rate
      const successRate = totalErrors > 0 
        ? Math.round((correctedErrors / totalErrors) * 100) 
        : 0;

      // Determine if it's partial success
      const partialSuccess = successRate > 0 && successRate < 100;

      // Calculate token charge with partial success discount
      let tokensToCharge = aiResult.tokensUsed;
      if (partialSuccess && successRate < 50) {
        // If success rate is less than 50%, charge only 50% of tokens
        tokensToCharge = Math.ceil(aiResult.tokensUsed * 0.5);
      }

      // Consume tokens
      const consumeResult = await this.consumeTokensHandler.handle({
        userId: request.userId,
        amount: tokensToCharge,
        feature: "excel_correction",
        metadata: {
          fileId: request.fileId,
          analysisId: request.analysisId,
          originalTokens: aiResult.tokensUsed,
          successRate,
          partialSuccess,
          discount: partialSuccess && successRate < 50 ? "50%" : "none"
        }
      });

      if (!consumeResult.success) {
        return Result.failure({
          code: "INSUFFICIENT_TOKENS",
          message: "토큰이 부족합니다."
        });
      }

      // Save correction record
      const correctionRecord = await prisma.correction.create({
        data: {
          fileId: request.fileId,
          userId: request.userId,
          analysisId: request.analysisId,
          corrections: {
            total: totalErrors,
            corrected: correctedErrors,
            failed: failedCorrections,
            details: correctionDetails
          },
          correctedFileUrl,
          status: partialSuccess ? "PARTIAL" : correctedErrors === totalErrors ? "COMPLETED" : "FAILED",
          tokensUsed: aiResult.tokensUsed,
          tokensCharged: tokensToCharge,
          aiModel: aiResult.tier,
          confidence: aiResult.confidence,
          metadata: {
            successRate,
            partialSuccess,
            tokenDiscount: tokensToCharge < aiResult.tokensUsed,
            insights: aiResult.insights
          }
        }
      });

      // Update AI usage stats
      await this.updateAIUsageStats(
        request.userId,
        aiResult.tier,
        aiResult.tokensUsed,
        aiResult.cost
      );

      // Save error resolution failures for learning
      if (failedCorrections > 0 && correctionDetails.length > 0) {
        await this.saveResolutionFailures(
          request.fileId,
          request.userId,
          correctionDetails.filter(d => d.status === "failed")
        );
      }

      const response: CorrectWithAIResponse = {
        correctionId: correctionRecord.id,
        fileId: request.fileId,
        correctedFileUrl,
        totalErrors,
        correctedErrors,
        failedCorrections,
        successRate,
        tokensUsed: aiResult.tokensUsed,
        tokensCharged: tokensToCharge,
        partialSuccess,
        report: {
          summary: `${correctedErrors}/${totalErrors} 오류가 수정되었습니다. (성공률: ${successRate}%)`,
          corrections: correctionDetails,
          insights: aiResult.insights,
          aiTier: aiResult.tier,
          confidence: aiResult.confidence
        }
      };

      return Result.success(response);
    } catch (error) {
      console.error("AI correction error:", error);
      return Result.failure({
        code: "CORRECTION_FAILED",
        message: "AI 수정 중 오류가 발생했습니다."
      });
    }
  }

  private async applyCorrections(
    file: any,
    aiCorrections: any[],
    originalErrors: any[]
  ): Promise<{
    successCount: number;
    failureCount: number;
    correctedFileUrl?: string;
    details: CorrectionReport["corrections"];
  }> {
    try {
      // Load the Excel file
      const filePath = join(process.cwd(), file.uploadUrl);
      const fileBuffer = await readFile(filePath);
      const workbook = XLSX.read(fileBuffer);

      let successCount = 0;
      let failureCount = 0;
      const details: CorrectionReport["corrections"] = [];

      // Apply each correction
      for (const correction of aiCorrections) {
        try {
          const error = originalErrors.find(e => 
            e.location?.cell === correction.location ||
            e.location?.toString() === correction.location
          );

          if (!error) {
            failureCount++;
            details.push({
              location: correction.location,
              original: null,
              corrected: correction.suggestion,
              status: "failed",
              reason: "원본 오류를 찾을 수 없습니다"
            });
            continue;
          }

          // Apply correction based on type
          const worksheet = workbook.Sheets[error.location.sheet];
          if (!worksheet) {
            failureCount++;
            details.push({
              location: correction.location,
              original: error.value,
              corrected: correction.suggestion,
              status: "failed",
              reason: "시트를 찾을 수 없습니다"
            });
            continue;
          }

          // Apply the correction
          if (correction.formula) {
            // Formula correction
            const cell = worksheet[error.location.cell];
            if (cell) {
              cell.f = correction.formula;
              cell.v = undefined; // Clear cached value
              successCount++;
              details.push({
                location: correction.location,
                original: error.value,
                corrected: correction.formula,
                status: "success"
              });
            } else {
              failureCount++;
              details.push({
                location: correction.location,
                original: error.value,
                corrected: correction.formula,
                status: "failed",
                reason: "셀을 찾을 수 없습니다"
              });
            }
          } else if (correction.suggestion) {
            // Value correction
            worksheet[error.location.cell] = {
              v: correction.suggestion,
              t: this.getCellType(correction.suggestion)
            };
            successCount++;
            details.push({
              location: correction.location,
              original: error.value,
              corrected: correction.suggestion,
              status: "success"
            });
          }
        } catch (err) {
          failureCount++;
          details.push({
            location: correction.location,
            original: null,
            corrected: correction.suggestion,
            status: "failed",
            reason: "수정 적용 중 오류 발생"
          });
        }
      }

      // Save corrected file if any corrections were successful
      let correctedFileUrl: string | undefined;
      if (successCount > 0) {
        const correctedFileName = `corrected_${file.fileName}`;
        const correctedFilePath = join(process.cwd(), "uploads", correctedFileName);
        const correctedBuffer = XLSX.write(workbook, { 
          type: "buffer", 
          bookType: "xlsx" 
        });
        await writeFile(correctedFilePath, correctedBuffer);
        correctedFileUrl = `/uploads/${correctedFileName}`;
      }

      return {
        successCount,
        failureCount,
        correctedFileUrl,
        details
      };
    } catch (error) {
      console.error("Apply corrections error:", error);
      return {
        successCount: 0,
        failureCount: aiCorrections.length,
        details: []
      };
    }
  }

  private getCellType(value: any): string {
    if (typeof value === "number") return "n";
    if (typeof value === "boolean") return "b";
    if (value instanceof Date) return "d";
    return "s"; // string
  }

  private async updateAIUsageStats(
    userId: string,
    tier: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const updateData = tier === "TIER1" ? {
      tier1Calls: { increment: 1 },
      tier1Tokens: { increment: tokens },
      tier1Cost: { increment: cost }
    } : {
      tier2Calls: { increment: 1 },
      tier2Tokens: { increment: tokens },
      tier2Cost: { increment: cost }
    };

    await prisma.aIUsageStats.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData
      },
      update: updateData
    });
  }

  private async saveResolutionFailures(
    fileId: string,
    userId: string,
    failedCorrections: CorrectionReport["corrections"]
  ): Promise<void> {
    for (const failure of failedCorrections) {
      try {
        await prisma.errorResolutionFailure.create({
          data: {
            fileId,
            userId,
            failureReason: failure.reason || "Unknown",
            failureDetails: {
              location: failure.location,
              original: failure.original,
              attempted: failure.corrected
            },
            attemptedMethods: ["AI_CORRECTION"],
            errorSnapshot: {
              location: failure.location,
              value: failure.original
            }
          }
        });
      } catch (err) {
        console.error("Failed to save resolution failure:", err);
      }
    }
  }
}