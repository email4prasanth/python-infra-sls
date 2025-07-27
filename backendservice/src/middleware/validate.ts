import { ZodSchema } from 'zod';
import { HttpStatus } from '../lib/enum';
import { AppError } from '../lib/error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validate = (schema: ZodSchema, req: any) => {
  const result = schema.safeParse(req);
  if (!result.success) {
    throw new AppError(JSON.stringify(result.error.flatten().fieldErrors), HttpStatus.BAD_REQUEST);
  }
  return true;
};
