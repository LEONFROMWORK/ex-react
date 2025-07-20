import { EnhancedExcelAnalyzer } from "@/lib/excel/analyzer-enhanced"
import { OpenAI } from "openai"
import { prisma } from "@/lib/prisma"
import { config } from "@/config"

// Service imports - conditionally loaded based on environment
import { LocalFileStorage } from "@/Infrastructure/ExternalServices/LocalFileStorage"

// Repository imports
import { PrismaFileRepository } from "@/Infrastructure/Repositories/PrismaFileRepository"
import { PrismaAnalysisRepository } from "@/Infrastructure/Repositories/PrismaAnalysisRepository"
import { IFileRepository } from "@/Common/Repositories/IFileRepository"
import { IAnalysisRepository } from "@/Common/Repositories/IAnalysisRepository"

// AI Model Management handlers
import { ConfigureModelHandler } from "@/Features/AIModelManagement/ConfigureModel/ConfigureModel"
import { SelectModelHandler } from "@/Features/AIModelManagement/SelectModel/SelectModel"
import { ValidateModelHandler } from "@/Features/AIModelManagement/ValidateModel/ValidateModel"
import { GetActiveModelsHandler } from "@/Features/AIModelManagement/GetActiveModels/GetActiveModels"
import { LogUsageHandler, GetUsageStatsHandler } from "@/Features/AIModelManagement/MonitorUsage/MonitorUsage"

// AI Chat handlers - temporarily disabled
// import { SendMessageHandler } from "@/Features/AIChat/SendMessage/SendMessage"
// import { SendChatMessageHandler } from "@/Features/AIChat/SendChatMessage"
// import { ClassifyIntentHandler } from "@/Features/AIChat/ClassifyIntent/ClassifyIntent"
// import { GenerateResponseHandler } from "@/Features/AIChat/GenerateResponse/GenerateResponse"
// import { ManageConversationHandler } from "@/Features/AIChat/ManageConversation/ManageConversation"

// Service interfaces
export interface IFileStorage {
  save(file: Buffer, key: string): Promise<string>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  uploadAsync?(file: File, fileName: string): Promise<any>
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}

export interface INotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>
  sendSMS(to: string, message: string): Promise<void>
}

// Container class for dependency injection
export class Container {
  private static instance: Container
  private services: Map<string, any> = new Map()

  private constructor() {
    // Services will be registered on first use
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
      // Register services synchronously for now
      Container.instance.registerServicesSync()
    }
    return Container.instance
  }
  
  private registerServicesSync() {
    // Core services
    this.register("prisma", () => prisma)
    this.register("excelAnalyzer", () => new EnhancedExcelAnalyzer())
    
    // AI services - environment aware
    if (config.ai.useMock) {
      this.register("openai", () => {
        // Lazy load mock service
        const MockAIService = require("@/Services/AI/MockAIService").MockAIService
        return new MockAIService()
      })
    } else {
      this.register("openai", () => new OpenAI({
        apiKey: config.ai.providers.openai,
      }))
    }
    
    // Cache service - environment aware
    if (config.cache.provider === 'redis' && config.cache.redis.enabled) {
      this.register("cache", () => {
        const RedisCacheService = require("@/Services/Cache/RedisCacheService").RedisCacheService
        return new RedisCacheService()
      })
    } else {
      this.register("cache", () => {
        const InMemoryCacheService = require("@/Services/Cache/InMemoryCacheService").InMemoryCacheService
        return new InMemoryCacheService()
      })
    }
    
    // File storage - use local storage only
    this.register("fileStorage", () => new LocalFileStorage())
    
    // Repository services
    this.register("fileRepository", () => new PrismaFileRepository(prisma))
    this.register("analysisRepository", () => new PrismaAnalysisRepository(prisma))
    
    // Notification service - environment aware
    if (config.email.provider === 'mock') {
      this.register("notification", () => new MockEmailService())
    } else {
      this.register("notification", () => new EmailNotificationService())
    }
    
    // Rest of services...
    this.registerHandlers()
  }

  private registerHandlers() {
    // Prompt cache service (Excel generation)
    this.register("promptCacheService", () => this.get("cache"))
    
    // AI Model Management handlers
    this.register("configureModelHandler", () => new ConfigureModelHandler())
    this.register("selectModelHandler", () => new SelectModelHandler())
    this.register("validateModelHandler", () => new ValidateModelHandler())
    this.register("getActiveModelsHandler", () => new GetActiveModelsHandler())
    this.register("logUsageHandler", () => new LogUsageHandler())
    this.register("getUsageStatsHandler", () => new GetUsageStatsHandler())
    
    // AI Chat handlers - temporarily disabled
    // this.register("sendMessageHandler", () => new SendMessageHandler(
    //   undefined,
    //   this.get("classifyIntentHandler"),
    //   this.get("selectModelHandler"),
    //   this.get("generateResponseHandler"),
    //   this.get("manageConversationHandler"),
    //   this.get("logUsageHandler")
    // ))
    // this.register("sendChatMessageHandler", () => new SendChatMessageHandler())
    // this.register("classifyIntentHandler", () => new ClassifyIntentHandler())
    // this.register("generateResponseHandler", () => new GenerateResponseHandler())
    // this.register("manageConversationHandler", () => new ManageConversationHandler())
  }

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory)
  }

  get<T>(key: string): T {
    const factory = this.services.get(key)
    if (!factory) {
      throw new Error(`Service ${key} not registered`)
    }
    return factory()
  }

  // Convenience methods
  getPrisma() {
    return this.get<typeof prisma>("prisma")
  }

  getExcelAnalyzer() {
    return this.get<EnhancedExcelAnalyzer>("excelAnalyzer")
  }

  getOpenAI() {
    return this.get<OpenAI>("openai")
  }

  getCache() {
    return this.get<ICacheService>("cache")
  }

  getFileStorage() {
    return this.get<IFileStorage>("fileStorage")
  }

  getNotificationService() {
    return this.get<INotificationService>("notification")
  }
  
  // Repository services
  getFileRepository() {
    return this.get<IFileRepository>("fileRepository")
  }
  
  getAnalysisRepository() {
    return this.get<IAnalysisRepository>("analysisRepository")
  }
  
  // AI Model Management handlers
  getConfigureModelHandler() {
    return this.get<ConfigureModelHandler>("configureModelHandler")
  }
  
  getSelectModelHandler() {
    return this.get<SelectModelHandler>("selectModelHandler")
  }
  
  getValidateModelHandler() {
    return this.get<ValidateModelHandler>("validateModelHandler")
  }
  
  getGetActiveModelsHandler() {
    return this.get<GetActiveModelsHandler>("getActiveModelsHandler")
  }
  
  getLogUsageHandler() {
    return this.get<LogUsageHandler>("logUsageHandler")
  }
  
  getGetUsageStatsHandler() {
    return this.get<GetUsageStatsHandler>("getUsageStatsHandler")
  }
  
  // AI Chat handlers - temporarily disabled
  getSendMessageHandler() {
    // Temporary placeholder until proper implementation
    return {
      handle: async () => ({ success: false, error: 'Chat feature temporarily disabled' })
    }
  }
  
  // getSendChatMessageHandler() {
  //   return this.get<SendChatMessageHandler>("sendChatMessageHandler")
  // }
  
  // getClassifyIntentHandler() {
  //   return this.get<ClassifyIntentHandler>("classifyIntentHandler")
  // }
  
  // getGenerateResponseHandler() {
  //   return this.get<GenerateResponseHandler>("generateResponseHandler")
  // }
  
  // getManageConversationHandler() {
  //   return this.get<ManageConversationHandler>("manageConversationHandler")
  // }
}

// Notification implementations
class EmailNotificationService implements INotificationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Implementation would use SendGrid, AWS SES, etc.
    console.log(`Email to ${to}: ${subject}`)
  }

  async sendSMS(to: string, message: string): Promise<void> {
    // Implementation would use Twilio, AWS SNS, etc.
    console.log(`SMS to ${to}: ${message}`)
  }
}

class MockEmailService implements INotificationService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[MOCK] Email to ${to}: ${subject}`)
    console.log(`[MOCK] Body: ${body}`)
  }

  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[MOCK] SMS to ${to}: ${message}`)
  }
}

// Export singleton instance
export const container = Container.getInstance()