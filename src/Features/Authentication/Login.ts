import { z } from "zod";
import { Result } from "@/Common/Result";
import { AuthErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "next-auth/react";

// Request Schema
export const LoginRequestSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Response Type
export interface LoginResponse {
  userId: string;
  email: string;
  name: string;
  role: string;
  token?: string; // For API usage
}

// Validator
export class LoginValidator {
  static validate(request: LoginRequest): Result<void> {
    try {
      LoginRequestSchema.parse(request);
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
export class LoginHandler {
  async handle(request: LoginRequest): Promise<Result<LoginResponse>> {
    try {
      // Validate request
      const validationResult = LoginValidator.validate(request);
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error);
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: request.email },
      });

      if (!user) {
        return Result.failure(AuthErrors.InvalidCredentials);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        request.password,
        user.password
      );

      if (!isPasswordValid) {
        return Result.failure(AuthErrors.InvalidCredentials);
      }

      // Update last login - commented out if field doesn't exist in schema
      // await prisma.user.update({
      //   where: { id: user.id },
      //   data: { lastLogin: new Date() },
      // });

      const response: LoginResponse = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      return Result.success(response);
    } catch (error) {
      console.error("Login handler error:", error);
      return Result.failure(AuthErrors.InvalidCredentials);
    }
  }
}