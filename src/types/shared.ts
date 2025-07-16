/**
 * Shared type definitions to eliminate duplicates across the codebase
 */

import { z } from 'zod'

// ============= Common Interfaces =============

/**
 * Unified file storage interface
 */
export interface IFileStorage {
  save(file: Buffer, key: string): Promise<string>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

/**
 * Unified tenant context interface
 */
export interface ITenantContext {
  tenantId: string
  userId: string
  organizationId?: string
  permissions?: string[]
}

/**
 * Unified analysis result interface
 */
export interface AnalysisResult {
  id: string
  fileId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errors: ExcelError[]
  summary: AnalysisSummary
  createdAt: Date
  updatedAt: Date
}

/**
 * Excel error interface (moved from excel.ts to avoid duplication)
 */
export interface ExcelError {
  id: string
  type: ErrorType
  severity: 'low' | 'medium' | 'high' | 'critical'
  cell?: string
  sheet?: string
  message: string
  suggestion?: string
  formula?: string
  value?: any
}

/**
 * Error types enum
 */
export enum ErrorType {
  FORMULA_ERROR = "FORMULA_ERROR",
  REFERENCE_ERROR = "REFERENCE_ERROR",
  CIRCULAR_REFERENCE = "CIRCULAR_REFERENCE",
  DATA_TYPE_MISMATCH = "DATA_TYPE_MISMATCH",
  PERFORMANCE_ISSUE = "PERFORMANCE_ISSUE"
}

/**
 * Analysis summary interface
 */
export interface AnalysisSummary {
  totalErrors: number
  criticalErrors: number
  warningsCount: number
  performanceScore: number
  sheets: number
  formulas: number
}

// ============= Common Schemas =============

/**
 * User authentication schema
 */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).default('USER'),
})

/**
 * File upload schema
 */
export const fileUploadSchema = z.object({
  filename: z.string(),
  size: z.number().max(52428800), // 50MB
  mimeType: z.string(),
  userId: z.string(),
})

/**
 * Common pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Common response schemas
 */
export const baseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
})

export const errorResponseSchema = baseResponseSchema.extend({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
})

export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  baseResponseSchema.extend({
    success: z.literal(true),
    data: dataSchema,
  })

// ============= Type Exports =============

export type AuthUser = z.infer<typeof authUserSchema>
export type FileUpload = z.infer<typeof fileUploadSchema>
export type PaginationParams = z.infer<typeof paginationSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>

/**
 * Generic success response type
 */
export type SuccessResponse<T> = {
  success: true
  data: T
  message?: string
  timestamp: string
}

/**
 * Pipeline behavior interface (unified)
 */
export interface IPipelineBehavior<TRequest, TResponse> {
  handle(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse>
}

/**
 * Common test user interface
 */
export interface TestUser {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
  tokens?: number
}