export class AppError extends Error {
  statusCode: number;
  constructor(message: string, errorCode: number) {
    super(message);
    this.statusCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
