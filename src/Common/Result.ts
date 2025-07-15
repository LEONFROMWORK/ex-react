export interface Error {
  code: string;
  message: string;
}

export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  public readonly value?: T;
  public readonly error?: Error;

  private constructor(isSuccess: boolean, value?: T, error?: Error) {
    if (isSuccess && error) {
      throw new Error("A successful result cannot have an error.");
    }
    if (!isSuccess && !error) {
      throw new Error("A failed result must have an error.");
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.value = value;
    this.error = error;
  }

  public static success<T>(value: T): Result<T> {
    return new Result<T>(true, value, undefined);
  }

  public static failure<T>(error: Error): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  public map<U>(fn: (value: T) => U): Result<U> {
    if (this.isSuccess && this.value !== undefined) {
      return Result.success(fn(this.value));
    }
    return Result.failure(this.error!);
  }

  public mapError(fn: (error: Error) => Error): Result<T> {
    if (this.isFailure && this.error) {
      return Result.failure(fn(this.error));
    }
    return Result.success(this.value!);
  }

  public match<U>(
    onSuccess: (value: T) => U,
    onFailure: (error: Error) => U
  ): U {
    return this.isSuccess
      ? onSuccess(this.value!)
      : onFailure(this.error!);
  }
}