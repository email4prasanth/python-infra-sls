import * as bcrypt from 'bcrypt';
import { HttpStatus } from '../enum';
import { AppError } from '../error';
export const generateHash = async (password: string): Promise<string> => {
  let hashedPassword = '';
  try {
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }
    return hashedPassword;
  } catch (error) {
    throw new AppError(error as string, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
