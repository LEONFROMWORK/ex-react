import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-helper";

export interface ITenantContext {
  currentTenantId: string;
  currentUserId: string;
}

// In-memory tenant context storage (in production, use AsyncLocalStorage)
const tenantContextStore = new Map<string, ITenantContext>();

export class TenantMiddleware {
  static async handle(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      const session = await getServerSession();
      
      if (session?.user) {
        // For SaaS, tenantId could be organizationId or just userId for personal accounts
        const tenantId = (session.user as any).organizationId || session.user.id;
        const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
        
        // Store tenant context
        tenantContextStore.set(requestId, {
          currentTenantId: tenantId,
          currentUserId: session.user.id,
        });

        // Add tenant info to request headers for downstream services
        const headers = new Headers(request.headers);
        headers.set("x-tenant-id", tenantId);
        headers.set("x-user-id", session.user.id);
        headers.set("x-request-id", requestId);

        // Execute next middleware/handler
        const response = await next();

        // Clean up context
        tenantContextStore.delete(requestId);

        return response;
      }

      return next();
    } catch (error) {
      console.error("Tenant middleware error:", error);
      return next();
    }
  }

  static getTenantContext(requestId: string): ITenantContext | undefined {
    return tenantContextStore.get(requestId);
  }
}

// Tenant-aware repository base class
export abstract class TenantAwareRepository<T> {
  constructor(protected tenantContext: ITenantContext) {}

  protected applyTenantFilter(query: any): any {
    return {
      ...query,
      where: {
        ...query.where,
        tenantId: this.tenantContext.currentTenantId,
      },
    };
  }

  protected addTenantId(data: any): any {
    return {
      ...data,
      tenantId: this.tenantContext.currentTenantId,
      userId: this.tenantContext.currentUserId,
    };
  }
}