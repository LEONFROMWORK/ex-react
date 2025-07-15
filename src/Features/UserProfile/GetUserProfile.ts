import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"

// Request/Response types
export class GetUserProfile {
  static readonly Request = z.object({
    userId: z.string(),
  })

  static readonly Response = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
    createdAt: z.date(),
    emailVerified: z.date().nullable(),
    subscription: z.object({
      plan: z.enum(["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]),
      tokensRemaining: z.number(),
      monthlyTokens: z.number(),
      validUntil: z.date().nullable(),
    }).nullable(),
    referral: z.object({
      referralCode: z.string(),
      referralCount: z.number(),
      totalEarned: z.number(),
    }).nullable(),
    usage: z.object({
      filesProcessed: z.number(),
      errorsDetected: z.number(),
      errorsCorrected: z.number(),
    }),
  })
}

export type GetUserProfileRequest = z.infer<typeof GetUserProfile.Request>
export type GetUserProfileResponse = z.infer<typeof GetUserProfile.Response>

// Validator
export class GetUserProfileValidator {
  static validate(request: unknown): Result<GetUserProfileRequest> {
    try {
      const validated = GetUserProfile.Request.parse(request)
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
export class GetUserProfileHandler {
  async handle(request: GetUserProfileRequest): Promise<Result<GetUserProfileResponse>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        include: {
          subscription: true,
          referral: true,
          files: {
            select: {
              analyses: {
                select: {
                  report: true,
                },
              },
            },
          },
        },
      })

      if (!user) {
        return Result.failure({
          code: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        })
      }

      // Calculate usage statistics
      let filesProcessed = 0
      let errorsDetected = 0
      let errorsCorrected = 0

      user.files.forEach(file => {
        if (file.analyses.length > 0) {
          filesProcessed++
          file.analyses.forEach(analysis => {
            const report = analysis.report as any
            errorsDetected += report?.totalErrors || 0
            errorsCorrected += report?.correctedErrors || 0
          })
        }
      })

      return Result.success({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        subscription: user.subscription ? {
          plan: user.subscription.plan,
          tokensRemaining: user.subscription.tokensRemaining,
          monthlyTokens: user.subscription.monthlyTokens,
          validUntil: user.subscription.validUntil,
        } : null,
        referral: user.referral ? {
          referralCode: user.referral.referralCode,
          referralCount: user.referral.referralCount,
          totalEarned: user.referral.totalEarned,
        } : null,
        usage: {
          filesProcessed,
          errorsDetected,
          errorsCorrected,
        },
      })
    } catch (error) {
      console.error("Get profile error:", error)
      return Result.failure({
        code: "PROFILE_FETCH_FAILED",
        message: "프로필을 불러오는 중 오류가 발생했습니다.",
      })
    }
  }
}