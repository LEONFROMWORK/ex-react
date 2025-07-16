export interface Error {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError extends Error {
  field?: string;
  value?: any;
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

  public async matchAsync<U>(
    onSuccess: (value: T) => Promise<U>,
    onFailure: (error: Error) => Promise<U>
  ): Promise<U> {
    return this.isSuccess
      ? await onSuccess(this.value!)
      : await onFailure(this.error!);
  }

  public bind<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isSuccess && this.value !== undefined) {
      return fn(this.value);
    }
    return Result.failure(this.error!);
  }

  public async bindAsync<U>(fn: (value: T) => Promise<Result<U>>): Promise<Result<U>> {
    if (this.isSuccess && this.value !== undefined) {
      return await fn(this.value);
    }
    return Result.failure(this.error!);
  }

  public tap(fn: (value: T) => void): Result<T> {
    if (this.isSuccess && this.value !== undefined) {
      fn(this.value);
    }
    return this;
  }

  public tapError(fn: (error: Error) => void): Result<T> {
    if (this.isFailure && this.error) {
      fn(this.error);
    }
    return this;
  }

  public getValueOrDefault(defaultValue: T): T {
    return this.isSuccess && this.value !== undefined ? this.value : defaultValue;
  }

  public getValueOrThrow(): T {
    if (this.isSuccess && this.value !== undefined) {
      return this.value;
    }
    throw new Error(this.error?.message || 'Result has no value');
  }
}