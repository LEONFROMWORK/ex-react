import { NextRequest, NextResponse } from 'next/server'
import { container } from '@/Infrastructure/DependencyInjection/Container'
import { getServerSession } from '@/lib/auth/session'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const handler = container.getValidateModelHandler()
    const result = await handler.handle({
      modelId: params.id
    })

    if (result.isFailure) {
      return NextResponse.json({ 
        valid: false, 
        error: result.error!.message 
      })
    }

    const validation = result.value!
    return NextResponse.json({ 
      valid: validation.isValid,
      error: validation.errorMessage,
      validatedAt: validation.validatedAt
    })
  } catch (error) {
    console.error('Error validating AI model:', error)
    return NextResponse.json({ 
      valid: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    })
  }
}