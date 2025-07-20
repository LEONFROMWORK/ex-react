import { z } from "zod";
import { Result } from "@/Common/Result";
import { prisma } from "@/lib/prisma";

// Request Schema
export const SaveResolutionFailureRequestSchema = z.object({
  errorPatternId: z.string().optional(),
  fileId: z.string(),
  userId: z.string(),
  failureReason: z.string(),
  failureDetails: z.any().optional(),
  attemptedMethods: z.array(z.string()).optional(),
  errorSnapshot: z.any(),
  userFeedback: z.string().optional(),
});

export type SaveResolutionFailureRequest = z.infer<typeof SaveResolutionFailureRequestSchema>;

// Response Type
export interface SaveResolutionFailureResponse {
  id: string;
  saved: boolean;
}

// Handler
export class SaveResolutionFailureHandler {
  async handle(
    request: SaveResolutionFailureRequest
  ): Promise<Result<SaveResolutionFailureResponse>> {
    try {
      const failure = await prisma.errorResolutionFailure.create({
        data: {
          errorPatternId: request.errorPatternId,
          fileId: request.fileId,
          userId: request.userId,
          failureReason: request.failureReason,
          failureDetails: request.failureDetails,
          attemptedMethods: JSON.stringify(request.attemptedMethods),
          errorSnapshot: request.errorSnapshot,
          userFeedback: request.userFeedback,
        },
      });

      return Result.success({
        id: failure.id,
        saved: true,
      });
    } catch (error) {
      console.error("Save resolution failure error:", error);
      return Result.failure({
        code: "ErrorPattern.FailureSaveFailed",
        message: "해결 실패 기록 저장에 실패했습니다",
      });
    }
  }
}