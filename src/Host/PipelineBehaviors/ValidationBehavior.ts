import { Result } from "@/Common/Result";

export interface IPipelineBehavior<TRequest, TResponse> {
  handle(
    request: TRequest,
    next: () => Promise<TResponse>
  ): Promise<TResponse>;
}

export class ValidationBehavior<TRequest, TResponse>
  implements IPipelineBehavior<TRequest, Result<TResponse>>
{
  constructor(
    private validators: Array<{
      validate(request: TRequest): Result<void> | Promise<Result<void>>;
    }>
  ) {}

  async handle(
    request: TRequest,
    next: () => Promise<Result<TResponse>>
  ): Promise<Result<TResponse>> {
    // Run all validators
    for (const validator of this.validators) {
      const validationResult = await validator.validate(request);
      if (validationResult.isFailure) {
        return Result.failure(validationResult.error);
      }
    }

    // If all validations pass, proceed to the handler
    return next();
  }
}