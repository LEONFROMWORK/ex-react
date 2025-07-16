import { ITenantContext, ITenantEntity } from '@/Common/Tenant/ITenantContext'
import { prisma } from '@/lib/prisma'

export abstract class TenantAwareRepository<T extends ITenantEntity> {
  constructor(
    protected readonly tenantContext: ITenantContext,
    protected readonly tableName: string
  ) {}

  protected get currentTenantId(): string {
    if (!this.tenantContext.currentTenantId) {
      throw new Error('Tenant context not set')
    }
    return this.tenantContext.currentTenantId
  }

  protected applyTenantFilter(query: any): any {
    if (!this.tenantContext.isMultiTenant) {
      return query
    }

    return {
      ...query,
      where: {
        ...query.where,
        tenantId: this.currentTenantId
      }
    }
  }

  async findById(id: string): Promise<T | null> {
    const query = this.applyTenantFilter({
      where: { id }
    })

    return (prisma as any)[this.tableName].findFirst(query)
  }

  async findMany(filter: any = {}): Promise<T[]> {
    const query = this.applyTenantFilter({
      where: filter
    })

    return (prisma as any)[this.tableName].findMany(query)
  }

  async create(data: Omit<T, 'tenantId'>): Promise<T> {
    const dataWithTenant = {
      ...data,
      tenantId: this.currentTenantId
    }

    return (prisma as any)[this.tableName].create({
      data: dataWithTenant
    })
  }

  async update(id: string, data: Partial<Omit<T, 'tenantId' | 'id'>>): Promise<T> {
    const query = this.applyTenantFilter({
      where: { id },
      data
    })

    return (prisma as any)[this.tableName].update(query)
  }

  async delete(id: string): Promise<T> {
    const query = this.applyTenantFilter({
      where: { id }
    })

    return (prisma as any)[this.tableName].delete(query)
  }
}