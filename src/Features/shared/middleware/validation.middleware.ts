// Shared Middleware - Validation
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export function withValidation<T extends z.ZodSchema>(schema: T) {
  return (handler: Function) => {
    return async (request: NextRequest, ...args: any[]) => {
      try {
        // FormData나 JSON 파싱
        let data
        const contentType = request.headers.get('content-type')
        
        if (contentType?.includes('multipart/form-data')) {
          data = await request.formData()
        } else {
          data = await request.json()
        }
        
        // 스키마 검증
        const validated = schema.parse(data)
        
        // 검증된 데이터로 핸들러 호출
        return handler(request, ...args)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation failed',
              details: error.errors
            },
            { status: 400 }
          )
        }
        
        throw error
      }
    }
  }
}