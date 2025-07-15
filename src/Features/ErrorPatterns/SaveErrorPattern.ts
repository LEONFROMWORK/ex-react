import { z } from "zod";
import { Result } from "@/Common/Result";
import { prisma } from "@/lib/prisma";

// Request Schema
export const SaveErrorPatternRequestSchema = z.object({
  fileId: z.string(),
  userId: z.string(),
  errorType: z.string(),
  errorCode: z.string().optional(),
  errorMessage: z.string(),
  cellLocation: z.string().optional(),
  sheetName: z.string().optional(),
  errorContext: z.any().optional(),
  category: z.string().optional(),
  severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
  resolved: z.boolean().default(false),
  resolutionType: z.string().optional(),
  resolutionDetails: z.any().optional(),
  resolutionTime: z.number().optional(),
  aiModel: z.string().optional(),
  aiConfidence: z.number().optional(),
  aiSuggestion: z.string().optional(),
});

export type SaveErrorPatternRequest = z.infer<typeof SaveErrorPatternRequestSchema>;

// Response Type
export interface SaveErrorPatternResponse {
  id: string;
  saved: boolean;
  similarPatternsCount: number;
}

// Handler
export class SaveErrorPatternHandler {
  async handle(
    request: SaveErrorPatternRequest
  ): Promise<Result<SaveErrorPatternResponse>> {
    try {
      // Check if similar pattern already exists
      const existingPattern = await prisma.errorPattern.findFirst({
        where: {
          errorType: request.errorType,
          errorCode: request.errorCode,
          category: request.category,
        },
      });

      if (existingPattern) {
        // Update frequency count
        await prisma.errorPattern.update({
          where: { id: existingPattern.id },
          data: { frequency: existingPattern.frequency + 1 },
        });

        return Result.success({
          id: existingPattern.id,
          saved: true,
          similarPatternsCount: existingPattern.frequency + 1,
        });
      }

      // Create new error pattern
      const errorPattern = await prisma.errorPattern.create({
        data: {
          fileId: request.fileId,
          userId: request.userId,
          errorType: request.errorType,
          errorCode: request.errorCode,
          errorMessage: request.errorMessage,
          cellLocation: request.cellLocation,
          sheetName: request.sheetName,
          errorContext: request.errorContext,
          category: request.category || this.categorizeError(request.errorType, request.errorMessage),
          severity: request.severity,
          resolved: request.resolved,
          resolutionType: request.resolutionType,
          resolutionDetails: request.resolutionDetails,
          resolutionTime: request.resolutionTime,
          aiModel: request.aiModel,
          aiConfidence: request.aiConfidence,
          aiSuggestion: request.aiSuggestion,
        },
      });

      return Result.success({
        id: errorPattern.id,
        saved: true,
        similarPatternsCount: 1,
      });
    } catch (error) {
      console.error("Save error pattern error:", error);
      return Result.failure({
        code: "ErrorPattern.SaveFailed",
        message: "오류 패턴 저장에 실패했습니다",
      });
    }
  }

  private categorizeError(errorType: string, errorMessage: string): string {
    // 오류 유형 자동 분류
    if (errorType.includes("FORMULA") || errorMessage.includes("#")) {
      return "FORMULA";
    }
    if (errorType.includes("TYPE") || errorType.includes("DATA")) {
      return "DATA_TYPE";
    }
    if (errorType.includes("REF") || errorType.includes("REFERENCE")) {
      return "REFERENCE";
    }
    if (errorType.includes("FORMAT")) {
      return "FORMAT";
    }
    if (errorType.includes("VALIDATION")) {
      return "VALIDATION";
    }
    return "OTHER";
  }
}