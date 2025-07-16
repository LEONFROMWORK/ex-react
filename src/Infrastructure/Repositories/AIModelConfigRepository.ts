import { TenantAwareRepository } from './TenantAwareRepository'
import { ITenantContext } from '@/Common/Tenant/ITenantContext'
import { AIModelConfig } from '@prisma/client'

interface TenantAwareAIModelConfig extends AIModelConfig {
  tenantId: string
}

export class AIModelConfigRepository extends TenantAwareRepository<TenantAwareAIModelConfig> {
  constructor(tenantContext: ITenantContext) {
    super(tenantContext, 'aIModelConfig')
  }

  async findActiveModels(): Promise<TenantAwareAIModelConfig[]> {
    return this.findMany({ isActive: true })
  }

  async findDefaultModel(): Promise<TenantAwareAIModelConfig | null> {
    const models = await this.findMany({ 
      isActive: true, 
      isDefault: true 
    })
    return models[0] || null
  }

  async findByProvider(provider: string): Promise<TenantAwareAIModelConfig[]> {
    return this.findMany({ provider })
  }
}