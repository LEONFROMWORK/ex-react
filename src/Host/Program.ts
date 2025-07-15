// Dependency Injection Configuration
// In a real application, you might use a DI container like inversify or tsyringe

import { LocalFileStorage } from "@/Infrastructure/ExternalServices/LocalFileStorage";
import { IFileStorage } from "@/Features/ExcelUpload/UploadExcel";

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.registerServices();
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  private registerServices() {
    // Register infrastructure services
    this.services.set("IFileStorage", new LocalFileStorage());
    
    // Register other services as needed
    // this.services.set("IEmailService", new EmailService());
    // this.services.set("IAIService", new OpenAIService());
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not registered`);
    }
    return service as T;
  }

  register<T>(serviceName: string, implementation: T): void {
    this.services.set(serviceName, implementation);
  }
}

// Export convenience functions
export function getFileStorage(): IFileStorage {
  return ServiceRegistry.getInstance().get<IFileStorage>("IFileStorage");
}

// Application configuration
export const AppConfig = {
  environment: process.env.NODE_ENV || "development",
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFileTypes: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    tier1Model: "gpt-3.5-turbo",
    tier2Model: "gpt-4",
  },
  storage: {
    type: process.env.STORAGE_TYPE || "local",
    azure: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      containerName: process.env.AZURE_STORAGE_CONTAINER,
    },
    s3: {
      bucketName: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION,
    },
  },
} as const;