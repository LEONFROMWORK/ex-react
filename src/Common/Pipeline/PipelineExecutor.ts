import { IPipelineBehavior, RequestHandler } from './IPipelineBehavior'

export class PipelineExecutor {
  constructor(
    private readonly behaviors: IPipelineBehavior<any, any>[]
  ) {}

  async execute<TRequest, TResponse>(
    request: TRequest,
    handler: RequestHandler<TRequest, TResponse>
  ): Promise<TResponse> {
    // Create the pipeline by chaining behaviors
    const pipeline = this.behaviors.reduceRight(
      (next, behavior) => {
        return () => behavior.handle(request, next)
      },
      () => handler(request)
    )

    return pipeline()
  }
}