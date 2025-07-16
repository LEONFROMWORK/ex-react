/**
 * Common utility functions to reduce code duplication across the application
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

/**
 * Common authentication middleware for API routes
 */
export async function withAuth<T>(
  handler: (req: NextRequest, session: any) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T | { error: string }>> => {
    try {
      const session = await getServerSession()
      if (!session) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      return await handler(req, session)
    } catch (error) {
      console.error("Auth middleware error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  }
}

/**
 * Common error handler for API routes
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`Error in ${context}:`, error)
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.errors },
      { status: 400 }
    )
  }
  
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? error.message 
      : "Internal server error"
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
  
  return NextResponse.json(
    { error: "Unknown error occurred" },
    { status: 500 }
  )
}

/**
 * Common transaction wrapper with error handling
 */
export async function withTransaction<T>(
  operation: (tx: any) => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await prisma.$transaction(operation)
  } catch (error) {
    console.error(`Transaction failed in ${errorContext}:`, error)
    throw error
  }
}

/**
 * Common validation wrapper
 */
export function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => e.message).join(", ") 
      }
    }
    return { success: false, error: "Validation failed" }
  }
}

/**
 * Common pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationParams = z.infer<typeof paginationSchema>

/**
 * Apply pagination to Prisma queries
 */
export function applyPagination(params: PaginationParams) {
  const { page, limit } = params
  return {
    skip: (page - 1) * limit,
    take: limit,
  }
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

/**
 * Create standardized API response
 */
export function createApiResponse<T>(
  data: T,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta,
  })
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 500
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  )
}