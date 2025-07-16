import { z } from 'zod'
import { Result } from '../Result'
import { IPipelineBehavior } from './IPipelineBehavior'

export class ValidationBehavior<TRequest, TResponse> implements IPipelineBehavior<TRequest, TResponse> {
  constructor(
    private readonly schema: z.ZodSchema<TRequest>
  ) {}

  async handle(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse> {
    const validation = this.schema.safeParse(request)
    
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      throw new Error(`Validation failed: ${errors}`)
    }

    return next()
  }
}