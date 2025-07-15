import { z } from "zod"
import { Result } from "@/Common/Result"
import { prisma } from "@/lib/prisma"
import { customAlphabet } from "nanoid"

// Request/Response types
export class CreateReferralCode {
  static readonly Request = z.object({
    userId: z.string(),
  })

  static readonly Response = z.object({
    referralCode: z.string(),
    referralUrl: z.string(),
    totalReferrals: z.number(),
    totalEarnings: z.number(),
  })
}

export type CreateReferralCodeRequest = z.infer<typeof CreateReferralCode.Request>
export type CreateReferralCodeResponse = z.infer<typeof CreateReferralCode.Response>

// Validator
export class CreateReferralCodeValidator {
  static validate(request: unknown): Result<CreateReferralCodeRequest> {
    try {
      const validated = CreateReferralCode.Request.parse(request)
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

// Generate readable referral code
const generateReferralCode = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  8
)

// Handler
export class CreateReferralCodeHandler {
  async handle(request: CreateReferralCodeRequest): Promise<Result<CreateReferralCodeResponse>> {
    try {
      // Check if user already has a referral code
      let referral = await prisma.referral.findUnique({
        where: { userId: request.userId },
      })

      if (!referral) {
        // Generate unique referral code
        let referralCode: string
        let attempts = 0
        const maxAttempts = 10

        do {
          referralCode = generateReferralCode()
          const existing = await prisma.referral.findUnique({
            where: { referralCode },
          })
          if (!existing) break
          attempts++
        } while (attempts < maxAttempts)

        if (attempts === maxAttempts) {
          return Result.failure({
            code: "CODE_GENERATION_FAILED",
            message: "추천 코드 생성에 실패했습니다.",
          })
        }

        // Create referral record
        referral = await prisma.referral.create({
          data: {
            userId: request.userId,
            referralCode,
          },
        })

        // Also update user's referralCode field for consistency
        await prisma.user.update({
          where: { id: request.userId },
          data: { referralCode },
        })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const referralUrl = `${baseUrl}/signup?ref=${referral.referralCode}`

      return Result.success({
        referralCode: referral.referralCode,
        referralUrl,
        totalReferrals: referral.referralCount,
        totalEarnings: referral.totalEarned,
      })
    } catch (error) {
      console.error("Referral code creation error:", error)
      return Result.failure({
        code: "REFERRAL_CODE_CREATION_FAILED",
        message: "추천 코드 생성 중 오류가 발생했습니다.",
      })
    }
  }
}