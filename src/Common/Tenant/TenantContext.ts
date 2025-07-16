import { ITenantContext } from './ITenantContext'

export class TenantContext implements ITenantContext {
  private _tenantId: string | null = null
  private _userId: string | null = null

  get currentTenantId(): string | null {
    return this._tenantId
  }

  get currentUserId(): string | null {
    return this._userId
  }

  get isMultiTenant(): boolean {
    return true // Can be configured based on environment
  }

  setContext(tenantId: string, userId: string): void {
    this._tenantId = tenantId
    this._userId = userId
  }

  clear(): void {
    this._tenantId = null
    this._userId = null
  }
}