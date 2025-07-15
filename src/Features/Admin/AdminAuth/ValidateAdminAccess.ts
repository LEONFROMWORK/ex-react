import { z } from "zod";
import { Result } from "@/Common/Result";
import { AuthErrors } from "@/Common/Errors";

// Request Schema
export const ValidateAdminAccessRequestSchema = z.object({
  userId: z.string().min(1, "사용자 ID가 필요합니다."),
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
  requestPath: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type ValidateAdminAccessRequest = z.infer<typeof ValidateAdminAccessRequestSchema>;

// Response Type
export interface ValidateAdminAccessResponse {
  isAllowed: boolean;
  role: string;
  permissions: AdminPermission[];
}

export interface AdminPermission {
  resource: string;
  actions: string[];
}

// Admin permissions configuration
export const ADMIN_PERMISSIONS = {
  ADMIN: [
    { resource: "users", actions: ["read", "update"] },
    { resource: "reviews", actions: ["read", "update"] },
    { resource: "statistics", actions: ["read"] },
    { resource: "announcements", actions: ["read", "create", "update"] },
    { resource: "payments", actions: ["read"] },
  ],
  SUPER_ADMIN: [
    { resource: "users", actions: ["read", "create", "update", "delete"] },
    { resource: "reviews", actions: ["read", "update", "delete"] },
    { resource: "statistics", actions: ["read", "export"] },
    { resource: "announcements", actions: ["read", "create", "update", "delete"] },
    { resource: "payments", actions: ["read", "update", "refund"] },
    { resource: "system", actions: ["read", "update"] },
  ],
};

// Handler
export class ValidateAdminAccessHandler {
  async handle(
    request: ValidateAdminAccessRequest
  ): Promise<Result<ValidateAdminAccessResponse>> {
    try {
      // Check if user has admin role
      const isAdmin = request.role === "ADMIN" || request.role === "SUPER_ADMIN";
      
      if (!isAdmin) {
        return Result.success({
          isAllowed: false,
          role: request.role,
          permissions: [],
        });
      }

      // Get permissions based on role
      const permissions = ADMIN_PERMISSIONS[request.role as keyof typeof ADMIN_PERMISSIONS] || [];

      return Result.success({
        isAllowed: true,
        role: request.role,
        permissions,
      });
    } catch (error) {
      console.error("Validate admin access error:", error);
      return Result.failure(AuthErrors.Unauthorized);
    }
  }
}

// Helper function to check specific permission
export function hasAdminPermission(
  permissions: AdminPermission[],
  resource: string,
  action: string
): boolean {
  const resourcePermission = permissions.find(p => p.resource === resource);
  return resourcePermission?.actions.includes(action) || false;
}