import { z } from 'zod';
import { HttpStatus } from '../lib/enum';
import { AppError } from '../lib/error';
import { validate } from './validate'; // Adjust path as needed

describe('validate', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().min(0),
  });

  it('should return true for valid input', () => {
    const req = { name: 'Alice', age: 30 };
    expect(validate(schema, req)).toBe(true);
  });

  it('should throw AppError for invalid input', () => {
    const req = { name: 'Alice', age: -5 };
    try {
      validate(schema, req);
      // If no error is thrown, fail the test
      fail('Expected AppError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as unknown as AppError).statusCode).toBe(HttpStatus.BAD_REQUEST);
      // The error message should include the field name
      expect((err as unknown as AppError).message).toContain('age');
    }
  });

  it('should throw AppError for missing required fields', () => {
    const req = { age: 25 }; // name is missing
    expect(() => validate(schema, req)).toThrow(AppError);
  });
});
