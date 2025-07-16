// Dependency Injection Container

import {
  IFileService,
  IAnalysisService,
  IErrorCorrectionService,
  IVBAService,
  IExcelGenerationService,
  IChatService
} from './interfaces'

import { FileService } from './implementations/FileService'
import { AnalysisService } from './implementations/AnalysisService'
import { ErrorCorrectionService } from './implementations/ErrorCorrectionService'
import { VBAService } from './implementations/VBAService'
import { ExcelGenerationService } from './implementations/ExcelGenerationService'
import { ChatService } from './implementations/ChatService'

class ServiceContainer {
  private services: Map<string, any> = new Map()
  private singletons: Map<string, any> = new Map()

  // Register a service
  register<T>(name: string, factory: () => T, singleton = true): void {
    this.services.set(name, { factory, singleton })
  }

  // Get a service instance
  get<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service ${name} not found`)
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory())
      }
      return this.singletons.get(name)
    }

    return service.factory()
  }

  // Clear all singletons (useful for testing)
  clear(): void {
    this.singletons.clear()
  }
}

// Create and configure the container
export const container = new ServiceContainer()

// Register services
container.register<IFileService>('FileService', () => new FileService())
container.register<IAnalysisService>('AnalysisService', () => new AnalysisService())
container.register<IErrorCorrectionService>('ErrorCorrectionService', () => new ErrorCorrectionService())
container.register<IVBAService>('VBAService', () => new VBAService())
container.register<IExcelGenerationService>('ExcelGenerationService', () => new ExcelGenerationService())
container.register<IChatService>('ChatService', () => new ChatService())

// Service hooks for React components
import { useCallback } from 'react'

export function useService<T>(serviceName: string): T {
  return container.get<T>(serviceName)
}

// Typed service hooks
export const useFileService = () => useService<IFileService>('FileService')
export const useAnalysisService = () => useService<IAnalysisService>('AnalysisService')
export const useErrorCorrectionService = () => useService<IErrorCorrectionService>('ErrorCorrectionService')
export const useVBAService = () => useService<IVBAService>('VBAService')
export const useExcelGenerationService = () => useService<IExcelGenerationService>('ExcelGenerationService')
export const useChatService = () => useService<IChatService>('ChatService')