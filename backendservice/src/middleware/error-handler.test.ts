import { AppError } from '../lib/error';
import { errorHandler } from './error-handler';

describe('errorHandler', () => {
  it('should return details for an AppError instance', () => {
    const err = new AppError('Something went wrong', 400);
    const result = errorHandler(err);

    expect(result.message).toBe('Something went wrong');
    expect(result.statusCode).toBe(400);
    expect(result.stack).toBeDefined();
  });

  it('should convert a plain Error to AppError with code 500', () => {
    const err = new Error('Oops!');
    const result = errorHandler(err);

    expect(result.message).toBe('Oops!');
    expect(result.statusCode).toBe(500);
    expect(result.stack).toBeDefined();
  });

  it('should convert a custom error with errorCode to AppError', () => {
    const err = { message: 'Custom error', errorCode: 403, name: 'CustomError' };
    const result = errorHandler(err);

    expect(result.message).toBe('Custom error');
    expect(result.statusCode).toBe(403);
    expect(result.stack).toBeDefined();
  });

  it('should use default message and code if error lacks them', () => {
    const err = {};
    const result = errorHandler(err);

    expect(result.message).toBe('Internal Server Error');
    expect(result.statusCode).toBe(500);
    expect(result.stack).toBeDefined();
  });
});
