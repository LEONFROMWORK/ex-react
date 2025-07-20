import { z } from "zod";
import { Result } from "@/Common/Result";
import { prisma } from "@/lib/prisma";
import { analyzeWithAI } from "@/lib/ai/analyzer";
import { ConsumeCreditsHandler } from "@/Features/Billing/CreditManagement/ConsumeCredits";
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
  creditsUsed: number;
  creditsCharged: number;
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
  // 토큰 대신 크레딧 시스템 사용
  // private consumeCreditsHandler = new ConsumeCreditsHandler();

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
      const errors = JSON.parse(analysis.errors || '[]'); // errors가 JSON 문자열인 경우
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

      // 토큰 소비 로직을 크레딧 시스템으로 대체 필요
      // const consumeResult = await this.consumeCreditsHandler.handle({
      //   userId: request.userId,
      //   amount: tokensToCharge,
      //   feature: "excel_correction",
      //   metadata: {
      //     fileId: request.fileId,
      //     analysisId: request.analysisId,
      //     originalTokens: aiResult.tokensUsed,
      //     successRate,
      //     partialSuccess,
      //     discount: partialSuccess && successRate < 50 ? "50%" : "none"
      //   }
      // });

      // if (!consumeResult.success) {
      //   return Result.failure({
      //     code: "INSUFFICIENT_CREDITS",
      //     message: "크레딧이 부족합니다."
      //   });
      // }

      // Save correction record
      const correctionRecord = await prisma.correction.create({
        data: {
          fileId: request.fileId,
          userId: request.userId,
          analysisId: request.analysisId,
          corrections: JSON.stringify({
            total: totalErrors,
            corrected: correctedErrors,
            failed: failedCorrections,
            details: correctionDetails
          }),
          correctedFileUrl,
          status: partialSuccess ? "PARTIAL" : correctedErrors === totalErrors ? "COMPLETED" : "FAILED",
          creditsUsed: aiResult.tokensUsed,
          creditsCharged: tokensToCharge,
          aiModel: aiResult.tier,
          confidence: aiResult.confidence,
          metadata: JSON.stringify({
            successRate,
            partialSuccess,
            tokenDiscount: tokensToCharge < aiResult.tokensUsed,
            insights: aiResult.insights
          })
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
        creditsUsed: aiResult.tokensUsed,
        creditsCharged: tokensToCharge,
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
    if (tier === "TIER1") {
      await prisma.aIUsageStats.upsert({
        where: { userId },
        create: {
          userId,
          tier1Calls: 1,
          tier1Credits: tokens,
          tier1Cost: cost,
          tier2Calls: 0,
          tier2Credits: 0,
          tier2Cost: 0
        },
        update: {
          tier1Calls: { increment: 1 },
          tier1Credits: { increment: tokens },
          tier1Cost: { increment: cost }
        }
      });
    } else {
      await prisma.aIUsageStats.upsert({
        where: { userId },
        create: {
          userId,
          tier1Calls: 0,
          tier1Credits: 0,
          tier1Cost: 0,
          tier2Calls: 1,
          tier2Credits: tokens,
          tier2Cost: cost
        },
        update: {
          tier2Calls: { increment: 1 },
          tier2Credits: { increment: tokens },
          tier2Cost: { increment: cost }
        }
      });
    }
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
            failureDetails: JSON.stringify({
              location: failure.location,
              original: failure.original,
              attempted: failure.corrected
            }),
            attemptedMethods: JSON.stringify(["AI_CORRECTION"]),
            errorSnapshot: JSON.stringify({
              location: failure.location,
              value: failure.original
            })
          }
        });
      } catch (err) {
        console.error("Failed to save resolution failure:", err);
      }
    }
  }
}