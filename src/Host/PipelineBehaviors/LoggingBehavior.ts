import { Result } from "@/Common/Result";

export class LoggingBehavior<TRequest, TResponse>
  implements IPipelineBehavior<TRequest, Result<TResponse>>
{
  private readonly logger: Console = console;

  async handle(
    request: TRequest,
    next: () => Promise<Result<TResponse>>
  ): Promise<Result<TResponse>> {
    const requestName = request.constructor.name;
    const requestId = this.generateRequestId();

    // Log request
    this.logger.log(
      `[${new Date().toISOString()}] Handling ${requestName} - RequestId: ${requestId}`,
      { request }
    );

    const startTime = Date.now();

    try {
      // Execute the handler
      const response = await next();
      const elapsedTime = Date.now() - startTime;

      // Log response
      if (response.isSuccess) {
        this.logger.log(
          `[${new Date().toISOString()}] Completed ${requestName} - RequestId: ${requestId} - Duration: ${elapsedTime}ms`
        );
      } else {
        this.logger.warn(
          `[${new Date().toISOString()}] Failed ${requestName} - RequestId: ${requestId} - Duration: ${elapsedTime}ms`,
          { error: response.error }
        );
      }

      return response;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      this.logger.error(
        `[${new Date().toISOString()}] Exception in ${requestName} - RequestId: ${requestId} - Duration: ${elapsedTime}ms`,
        error
      );
      throw error;
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}

interface IPipelineBehavior<TRequest, TResponse> {
  handle(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse>;
}