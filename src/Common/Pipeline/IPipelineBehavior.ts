export interface IPipelineBehavior<TRequest, TResponse> {
  handle(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse>
}

export type RequestHandler<TRequest, TResponse> = (
  request: TRequest
) => Promise<TResponse>