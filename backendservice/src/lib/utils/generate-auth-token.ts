import jwt, { SignOptions } from 'jsonwebtoken';
import { IJwtSignature } from '../../types';

export const generateAuthToken = (signData: IJwtSignature): string => {
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
      algorithm: 'HS256',
      expiresIn: '4h',
    }
  );
};

export const generateEmailToken = (signData: {
  userId: string;
  practiceId: string;
  email: string;
  role: string;
  hasExpiry: boolean;
}): string => {
  const { userId, practiceId, email, role, hasExpiry } = signData;
  const JWT_SECRET = process.env.JWT_SECRET as string;
  const JWT_PAYLOAD = {
    sub: userId ?? '',
    jti: practiceId ?? '',
    email,
    role: role ?? '',
  };

  const JWT_OPTION = hasExpiry
    ? ({
        algorithm: 'HS256',
        expiresIn: '10m',
      } as SignOptions)
    : ({
        algorithm: 'HS256',
      } as SignOptions);
  return jwt.sign(JWT_PAYLOAD, JWT_SECRET, { ...JWT_OPTION });
};
