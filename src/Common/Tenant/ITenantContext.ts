export interface ITenantContext {
  currentTenantId: string | null
  currentUserId: string | null
  isMultiTenant: boolean
}

export interface ITenantEntity {
  tenantId: string
}