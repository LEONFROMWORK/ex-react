import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class UpdateUserProfile {
  static readonly Request = z.object({
    userId: z.string(),
    name: z.string().min(2).max(50).optional(),
    preferences: z.object({
      language: z.enum(["ko", "en"]).optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
      emailNotifications: z.boolean().optional(),
      aiTierPreference: z.enum(["ECONOMY", "BALANCED", "PREMIUM"]).optional(),
    }).optional(),
  })

  static readonly Response = z.object({
    success: z.boolean(),
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      preferences: z.any(),
    }),
  })
}

export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfile.Request>
export type UpdateUserProfileResponse = z.infer<typeof UpdateUserProfile.Response>

// Validator
export class UpdateUserProfileValidator {
  static validate(request: unknown): Result<UpdateUserProfileRequest> {
    try {
      const validated = UpdateUserProfile.Request.parse(request)
      
      // At least one field should be provided
      if (!validated.name && !validated.preferences) {
        return Result.failure({
          code: "NO_UPDATE_FIELDS",
          message: "업데이트할 필드를 제공해주세요.",
        })
      }
      
      return Result.success(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: "VALIDATION_ERROR",
          message: error.errors.map(e => e.message).join(", "),
        })
      }
      return Result.failure({
        code: "INVALID_REQUEST",
        message: "잘못된 요청입니다.",
      })
    }
  }
}

// Handler
export class UpdateUserProfileHandler {
  async handle(request: UpdateUserProfileRequest): Promise<Result<UpdateUserProfileResponse>> {
    try {
      const updateData: any = {}
      
      if (request.name) {
        updateData.name = request.name
      }
      
      if (request.preferences) {
        updateData.preferences = request.preferences
      }

      const updatedUser = await prisma.user.update({
        where: { id: request.userId },
        data: updateData,
      })

      return Result.success({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          preferences: updatedUser.preferences,
        },
      })
    } catch (error) {
      console.error("Update profile error:", error)
      return Result.failure({
        code: "UPDATE_FAILED",
        message: "프로필 업데이트에 실패했습니다.",
      })
    }
  }
}