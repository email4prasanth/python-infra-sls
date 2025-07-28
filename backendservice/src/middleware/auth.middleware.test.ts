jest.mock('jsonwebtoken');
jest.mock('../lib/connections', () => ({
  sequelize: {
    query: jest.fn(),
    define: jest.fn(), // safe no-op
  },
}));
jest.mock('../lib/error', () => ({
  AppError: jest.fn(function (message, status) {
    this.message = message;
    this.status = status;
  }),
}));

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

import { APIGatewayProxyEventV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { sequelize } from '../lib/connections';
import { authMiddleware } from './auth.middleware';

// import { AppError } from '../lib/error';

describe('authMiddleware', () => {
  afterEach(() => jest.clearAllMocks());

  it('throws if authorization header is missing', async () => {
    const req = { headers: {} } as APIGatewayProxyEventV2;
    try {
      await authMiddleware(req);
      // If no error is thrown, fail the test
      fail('authMiddleware did not throw');
    } catch (err) {
      const _err = err as Error;
      expect(_err.message).toBe('Token not present');
    }
  });

  it('throws if authorization header is malformed', async () => {
    const req = { headers: { authorization: 'BadToken' } } as unknown as APIGatewayProxyEventV2;
    try {
      await authMiddleware(req);
      // If no error is thrown, fail the test
      fail('authMiddleware did not throw');
    } catch (err) {
      const _err = err as Error;
      expect(_err.message).toBe('Invalid token');
    }
  });

  it('throws if jwt.verify fails (expired)', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const req = { headers: { authorization: 'Bearer sometoken' } } as unknown as APIGatewayProxyEventV2;
    try {
      await authMiddleware(req);
      // If no error is thrown, fail the test
      fail('authMiddleware did not throw');
    } catch (err) {
      const _err = err as Error;
      expect(_err.message).toBe('Token expired');
    }
  });

  it('throws if login not found', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user1', jti: 'login1' });
    (sequelize.query as jest.Mock).mockResolvedValue([]);
    const req = { headers: { authorization: 'Bearer sometoken' } } as unknown as APIGatewayProxyEventV2;
    try {
      await authMiddleware(req);
      // If no error is thrown, fail the test
      fail('authMiddleware did not throw');
    } catch (err) {
      const _err = err as Error;
      expect(_err.message).toBe('Login does not exists');
    }
  });

  it('throws if token does not match', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user1', jti: 'login1' });
    (sequelize.query as jest.Mock).mockResolvedValue([{ auth_token: 'differenttoken' }]);
    const req = { headers: { authorization: 'Bearer sometoken' } } as unknown as APIGatewayProxyEventV2;

    try {
      await authMiddleware(req);
      // If no error is thrown, fail the test
      fail('authMiddleware did not throw');
    } catch (err) {
      const _err = err as Error;
      expect(_err.message).toBe('Invalid token match');
    }
  });

  it('returns true on valid token and login', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user1', jti: 'login1' });
    (sequelize.query as jest.Mock).mockResolvedValue([{ auth_token: 'sometoken' }]);
    const req = { headers: { authorization: 'Bearer sometoken' } } as unknown as APIGatewayProxyEventV2;
    try {
      const auth = await authMiddleware(req);
      expect(auth).toBe(true);
      // If no error is thrown, fail the test
      fail('authMiddleware did not throw');
    } catch (err) {
      const _err = err as Error;
      expect(_err.message).toBe('fail is not defined');
    }
  });
});
