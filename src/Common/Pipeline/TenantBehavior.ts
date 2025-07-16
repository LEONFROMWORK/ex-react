import { IPipelineBehavior } from './IPipelineBehavior'
import { ITenantContext } from '../Tenant/ITenantContext'

export class TenantBehavior<TRequest, TResponse> implements IPipelineBehavior<TRequest, TResponse> {
  constructor(
    private readonly tenantContext: ITenantContext
  ) {}

  async handle(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse> {
    // Ensure tenant context is set
    if (!this.tenantContext.currentTenantId) {
      throw new Error('Tenant context not initialized')
    }

    // Add tenant ID to request if it has the property
    if (typeof request === 'object' && request !== null && 'tenantId' in request) {
      (request as any).tenantId = this.tenantContext.currentTenantId
    }

    return next()
  }
}