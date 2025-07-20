import { z } from "zod";
import { Result } from "@/Common/Result";
import { AdminErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Request Schema
export const CreateAnnouncementRequestSchema = z.object({
  adminId: z.string().min(1, "관리자 ID가 필요합니다."),
  title: z.string().min(1, "제목이 필요합니다.").max(200),
  content: z.string().min(1, "내용이 필요합니다."),
  type: z.enum(["INFO", "WARNING", "UPDATE", "MAINTENANCE"]).default("INFO"),
  priority: z.number().min(0).max(10).default(0),
  isActive: z.boolean().default(true),
  targetAudience: z.string().optional(),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
});

export type CreateAnnouncementRequest = z.infer<typeof CreateAnnouncementRequestSchema>;

// Response Type
export interface CreateAnnouncementResponse {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
}

// Handler
export class CreateAnnouncementHandler {
  async handle(
    request: CreateAnnouncementRequest
  ): Promise<Result<CreateAnnouncementResponse>> {
    try {
      // Validate dates if provided
      if (request.startsAt && request.endsAt) {
        if (request.startsAt >= request.endsAt) {
          return Result.failure({
            code: "Admin.InvalidDateRange",
            message: "종료일은 시작일보다 늦어야 합니다",
          });
        }
      }

      // Create announcement
      const announcement = await prisma.announcement.create({
        data: {
          title: request.title,
          content: request.content,
          type: request.type,
          priority: request.priority,
          isActive: request.isActive,
          targetAudience: request.targetAudience,
          startsAt: request.startsAt,
          endsAt: request.endsAt,
          createdBy: request.adminId,
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId: request.adminId,
          action: "ANNOUNCEMENT_CREATED",
          targetType: "announcement",
          targetId: announcement.id,
          metadata: JSON.stringify({
            title: announcement.title,
            type: announcement.type,
          }),
        },
      });

      return Result.success({
        id: announcement.id,
        title: announcement.title,
        type: announcement.type,
        isActive: announcement.isActive,
        createdAt: announcement.createdAt,
      });
    } catch (error) {
      console.error("Create announcement error:", error);
      return Result.failure(AdminErrors.UpdateFailed);
    }
  }
}