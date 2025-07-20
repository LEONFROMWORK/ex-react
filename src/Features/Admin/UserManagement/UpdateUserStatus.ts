import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Request Schema
export const UpdateUserStatusRequestSchema = z.object({
  userId: z.string().min(1, "사용자 ID가 필요합니다."),
  adminId: z.string().min(1, "관리자 ID가 필요합니다."),
  action: z.enum(["activate", "deactivate", "suspend", "changeRole"]),
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
  reason: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusRequestSchema>;

// Response Type
export interface UpdateUserStatusResponse {
  userId: string;
  previousStatus: {
    emailVerified: Date | null;
    role: string;
  };
  newStatus: {
    emailVerified: Date | null;
    role: string;
  };
  updatedAt: Date;
}

// Handler
export class UpdateUserStatusHandler {
  async handle(
    request: UpdateUserStatusRequest
  ): Promise<Result<UpdateUserStatusResponse>> {
    try {
      // Get current user status
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: {
          id: true,
          emailVerified: true,
          role: true,
        },
      });

      if (!user) {
        return Result.failure(AdminErrors.UserNotFound);
      }

      const previousStatus = {
        emailVerified: user.emailVerified,
        role: user.role,
      };

      // Prepare update data
      const updateData: any = {};
      
      switch (request.action) {
        case "activate":
          updateData.emailVerified = new Date();
          break;
        case "deactivate":
          updateData.emailVerified = null;
          break;
        case "changeRole":
          if (!request.role) {
            return Result.failure(AdminErrors.InvalidRequest);
          }
          updateData.role = request.role;
          break;
        // Add more actions as needed
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: request.userId },
        data: updateData,
        select: {
          id: true,
          emailVerified: true,
          role: true,
          updatedAt: true,
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId: request.adminId,
          action: `USER_${request.action.toUpperCase()}`,
          targetType: "user",
          targetId: request.userId,
          metadata: JSON.stringify({
            previousStatus,
            newStatus: {
              emailVerified: updatedUser.emailVerified,
              role: updatedUser.role,
            },
            reason: request.reason,
          }),
          ipAddress: request.ipAddress,
        },
      });

      return Result.success({
        userId: updatedUser.id,
        previousStatus,
        newStatus: {
          emailVerified: updatedUser.emailVerified,
          role: updatedUser.role,
        },
        updatedAt: updatedUser.updatedAt,
      });
    } catch (error) {
      console.error("Update user status error:", error);
      return Result.failure(AdminErrors.UpdateFailed);
    }
  }
}