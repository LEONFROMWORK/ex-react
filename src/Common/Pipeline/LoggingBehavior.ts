import { IPipelineBehavior } from './IPipelineBehavior'

export class LoggingBehavior<TRequest, TResponse> implements IPipelineBehavior<TRequest, TResponse> {
  constructor(
    private readonly logger: {
      info: (message: string, data?: any) => void
      error: (message: string, error?: any) => void
    }
  ) {}

  async handle(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse> {
    const requestName = request.constructor.name
    const startTime = Date.now()

    this.logger.info(`Handling ${requestName}`, { request })

    try {
      const response = await next()
      const elapsedTime = Date.now() - startTime

      this.logger.info(`Handled ${requestName} in ${elapsedTime}ms`, { 
        response,
        elapsedTime 
      })

      return response
    } catch (error) {
      const elapsedTime = Date.now() - startTime
      
      this.logger.error(`Failed ${requestName} after ${elapsedTime}ms`, { 
        error,
        elapsedTime 
      })
      
      throw error
    }
  }
}