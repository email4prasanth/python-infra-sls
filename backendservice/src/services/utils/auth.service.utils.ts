import { QueryTypes } from 'sequelize';
import { sequelize } from '../../lib/connections';
import { HttpStatus } from '../../lib/enum';
import { AppError } from '../../lib/error';
import { ILogin } from '../../types';

export const checkLoginExists = async (loginId: string, emailId: string): Promise<ILogin> => {
  const getLoginQuery = `
  SELECT *
  FROM login
  WHERE
    id = '${loginId}'
    AND
    email_id = '${emailId}'`;
  const loginDetails = (await sequelize.query(getLoginQuery, {
    type: QueryTypes.SELECT,
    raw: true,
  })) as ILogin[];
  if (!(loginDetails.length > 0)) {
    throw new AppError('Login not found', HttpStatus.BAD_REQUEST);
  }

  return loginDetails[0] as ILogin;
};
