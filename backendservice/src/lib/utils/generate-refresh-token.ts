import jwt from 'jsonwebtoken';
import { IJwtSignature } from '../../types';

export const generateRefreshToken = (signData: IJwtSignature): string => {
  const JWT_SECRET = process.env.JWT_SECRET as string;
  return jwt.sign(
    {
      sub: signData.userId,
      jti: signData.loginId,
      email: signData.email,
      role: signData.role,
    },
    JWT_SECRET,
    {
      expiresIn: '8h',
    }
  );
};
