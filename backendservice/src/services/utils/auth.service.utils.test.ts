import { QueryTypes } from 'sequelize';
import { sequelize } from '../../lib/connections';
import { HttpStatus } from '../../lib/enum';
import { AppError } from '../../lib/error';
import { checkLoginExists } from './auth.service.utils';

jest.mock('../../lib/connections', () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

describe('checkLoginExists', () => {
  it('should return login details when valid loginId and userId are provided', async () => {
    const mockLoginId = 'login123';
    const mockEmailId = 'example@gmail.com';
    const mockLoginDetails = [{ id: mockLoginId, email_id: mockEmailId, email: 'test@example.com' }];

    (sequelize.query as jest.Mock).mockResolvedValue(mockLoginDetails);

    const result = await checkLoginExists(mockLoginId, mockEmailId);

    expect(sequelize.query).toHaveBeenCalledWith(
      `
  SELECT *
  FROM login
  WHERE
    id = '${mockLoginId}'
    AND
    email_id = '${mockEmailId}'`,
      {
        type: QueryTypes.SELECT,
        raw: true,
      }
    );

    expect(result).toEqual(mockLoginDetails[0]);
  });

  it('should throw AppError with "Login not found" message when no login is found', async () => {
    const mockLoginId = 'nonexistent-login';
    const mockEmailId = 'nonexistancee@gmail.com';

    (sequelize.query as jest.Mock).mockResolvedValue([]);

    await expect(checkLoginExists(mockLoginId, mockEmailId)).rejects.toThrow(
      new AppError('Login not found', HttpStatus.BAD_REQUEST)
    );

    expect(sequelize.query).toHaveBeenCalledWith(
      `
  SELECT *
  FROM login
  WHERE
    id = '${mockLoginId}'
    AND
    email_id = '${mockEmailId}'`,
      {
        type: QueryTypes.SELECT,
        raw: true,
      }
    );
  });
});
