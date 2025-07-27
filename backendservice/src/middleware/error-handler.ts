import { AppError } from '../lib/error';

interface ICustomError extends Error {
  errorCode?: number;
}

export const errorHandler = (err: unknown) => {
  let error = err;

  // If the error isn't an AppError, convert it into one
  if (!(error instanceof AppError)) {
    error = new AppError(
      (err as ICustomError).message || 'Internal Server Error',
      (err as ICustomError).errorCode ?? 500
    );
  }

  const appError = error as AppError;

  return {
    message: appError.message,
    stack: appError.stack,
    statusCode: appError.statusCode,
  };
};
