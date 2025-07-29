import * as bcrypt from 'bcrypt';
import { HttpStatus } from '../enum';
import { AppError } from '../error';
import { generateHash } from './password';

jest.mock('bcrypt');

describe('generateHash', () => {
  const mockPassword = 'testPassword';
  const mockHash = 'hashedPassword123';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return hashed password on success', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

    const result = await generateHash(mockPassword);

    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
    expect(result).toBe(mockHash);
  });

  it('should throw AppError on bcrypt failure', async () => {
    const errorMessage = 'bcrypt failed';
    (bcrypt.hash as jest.Mock).mockRejectedValue(errorMessage);

    await expect(generateHash(mockPassword)).rejects.toThrow(AppError);
    await expect(generateHash(mockPassword)).rejects.toThrow(errorMessage);
    await expect(generateHash(mockPassword)).rejects.toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});
