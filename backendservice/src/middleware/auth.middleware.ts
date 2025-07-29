import { APIGatewayProxyEventV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../lib/connections';
import { HttpStatus } from '../lib/enum';
import { AppError } from '../lib/error';
import { IJwtDecode, ILogin } from '../types';
const JWT_SECRET = process.env.JWT_SECRET as string;

const mapJwtError = (error: string) => {
  const functionMap: { [key: string]: string } = {
    'jwt expired': 'Token expired',
    'jwt must be provided': 'Token not present',
    'invalid signature': 'Invalid token',
    'jwt malformed': 'Token malformed',
  };
  return functionMap[error] || error;
};

export const authMiddleware = async (req: APIGatewayProxyEventV2) => {
  try {
    const bearerToken = req.headers.authorization;

    if (!bearerToken) {
      throw new AppError('Token not present', HttpStatus.UNAUTHORIZED);
    }

    const [bearer, token] = bearerToken.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new AppError('Invalid token', HttpStatus.UNAUTHORIZED);
    }

    const decodedJwt = jwt.verify(token, JWT_SECRET); // if fails, it will throw an error. Hence the catch block will be executed
    const { sub, jti } = decodedJwt as IJwtDecode;

    const loginExistanceQuery = `SELECT * FROM login WHERE id = :id AND user_id = :user_id`;

    const loginDetail = (await sequelize.query(loginExistanceQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        id: jti,
        user_id: sub,
      },
    })) as ILogin[];

    const _loginDetails = loginDetail[0] as ILogin;

    if (!_loginDetails) {
      throw new AppError('Login does not exists', HttpStatus.UNAUTHORIZED);
    }

    if (_loginDetails.auth_token !== token) {
      throw new AppError('Invalid token match', HttpStatus.UNAUTHORIZED);
    }

    return true;
  } catch (err) {
    const e = err as Error;
    const message = e.message;
    throw new AppError(mapJwtError(message), HttpStatus.UNAUTHORIZED);
  }
};
