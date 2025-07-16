// Shared Middleware - Error Handling
import { NextRequest, NextResponse } from 'next/server'

export function withErrorHandler(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      console.error('API Error:', error)
      
      // 에러 타입별 처리
      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        )
      }
      
      if (error instanceof UnauthorizedError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'UNAUTHORIZED'
          },
          { status: 401 }
        )
      }
      
      if (error instanceof NotFoundError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'NOT_FOUND'
          },
          { status: 404 }
        )
      }
      
      // 기본 에러
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      )
    }
  }
}

// Custom Error Classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}