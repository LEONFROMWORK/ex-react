import { z } from "zod";
import { Result } from "@/Common/Result";
import { AuthErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Request Schema
export const SignupRequestSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
  referralCode: z.string().optional(),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

// Response Type
export interface SignupResponse {
  userId: string;
  email: string;
  name: string;
  referralCode: string;
  createdAt: Date;
}

// Domain Rules
export class SignupDomainRules {
  static readonly passwordSaltRounds = 10;
  static readonly defaultUserRole = "USER";
  static readonly defaultCredits = 100;

  static async isEmailAvailable(email: string): Promise<boolean> {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    return !existingUser;
  }

  static generateReferralCode(userId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `${userId.substring(0, 4)}${timestamp}${random}`.toUpperCase();
  }
}

// Validator
export class SignupValidator {
  static async validate(request: SignupRequest): Promise<Result<void>> {
    try {
      SignupRequestSchema.parse(request);

      // Check if email is already taken
      const isAvailable = await SignupDomainRules.isEmailAvailable(request.email);
      if (!isAvailable) {
        return Result.failure({
          code: "Auth.EmailAlreadyExists",
          message: "이미 사용 중인 이메일입니다",
        });
      }

      return Result.success(undefined);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.failure({
          code: "Validation.Failed",
          message: error.errors[0].message,
        });
      }
      return Result.failure(AuthErrors.InvalidCredentials);
    }
  }
}

// Handler
export class SignupHandler {
  async handle(request: SignupRequest): Promise<Result<SignupResponse>> {
    try {
      // Validate request
      const validationResult = await SignupValidator.validate(request);
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        request.password,
        SignupDomainRules.passwordSaltRounds
      );

      // Create user with transaction
      const user = await prisma.$transaction(async (tx) => {
        // Generate a temporary referral code first
        const tempReferralCode = `TEMP_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        
        // Create user
        const newUser = await tx.user.create({
          data: {
            email: request.email,
            password: hashedPassword,
            name: request.name,
            role: SignupDomainRules.defaultUserRole,
            credits: SignupDomainRules.defaultCredits,
            referralCode: tempReferralCode,
          },
        });

        // Generate final referral code and update
        const referralCode = SignupDomainRules.generateReferralCode(newUser.id);
        await tx.user.update({
          where: { id: newUser.id },
          data: { referralCode },
        });

        // Process referral if provided
        if (request.referralCode) {
          await this.processReferral(tx, request.referralCode, newUser.id);
        }

        return { ...newUser, referralCode };
      });

      const response: SignupResponse = {
        userId: user.id,
        email: user.email,
        name: user.name,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      };

      return Result.success(response);
    } catch (error) {
      console.error("Signup handler error:", error);
      return Result.failure({
        code: "Auth.SignupFailed",
        message: "회원가입 중 오류가 발생했습니다",
      });
    }
  }

  private async processReferral(
    tx: any,
    referralCode: string,
    newUserId: string
  ): Promise<void> {
    // Find referrer
    const referrer = await tx.user.findUnique({
      where: { referralCode },
    });

    if (referrer) {
      // Award credits to referrer
      await tx.user.update({
        where: { id: referrer.id },
        data: { credits: { increment: 50 } },
      });

      // Award bonus credits to new user
      await tx.user.update({
        where: { id: newUserId },
        data: { credits: { increment: 25 } },
      });

      // Log referral
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: newUserId,
        },
      });
    }
  }
}