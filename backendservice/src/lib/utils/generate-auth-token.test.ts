import jwt from 'jsonwebtoken';
import { IJwtSignature } from '../../types';
import { generateAuthToken } from './generate-auth-token';

jest.mock('jsonwebtoken');

describe('generateAuthToken', () => {
  it('should generate a valid JWT token with correct payload structure', () => {
    const mockSignData: IJwtSignature = {
      userId: 'user123',
      loginId: 'login456',
      email: 'test@example.com',
      role: 'user',
    };

    const mockJwtSecret = 'test-secret';
    process.env.JWT_SECRET = mockJwtSecret;

    const mockToken = 'mocked-jwt-token';
    (jwt.sign as jest.Mock).mockReturnValue(mockToken);

    const result = generateAuthToken(mockSignData);

    expect(result).toBe(mockToken);
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        sub: mockSignData.userId,
        jti: mockSignData.loginId,
        email: mockSignData.email,
        role: mockSignData.role,
      },
      mockJwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: '4h',
      }
    );
  });

  it('should set the token expiration to 4 hours from creation time', () => {
    const mockSignData: IJwtSignature = {
      userId: 'user123',
      loginId: 'login456',
      email: 'test@example.com',
      role: 'user',
    };

    const mockJwtSecret = 'test-secret';
    process.env.JWT_SECRET = mockJwtSecret;

    const mockToken = 'mocked-jwt-token';
    (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
      expect(options.expiresIn).toBe('4h');
      return mockToken;
    });

    const result = generateAuthToken(mockSignData);

    expect(result).toBe(mockToken);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.any(Object),
      mockJwtSecret,
      expect.objectContaining({ expiresIn: '4h' })
    );
  });

  it('should include the user ID in the "sub" claim of the token', () => {
    const mockSignData: IJwtSignature = {
      userId: 'user123',
      loginId: 'login456',
      email: 'test@example.com',
      role: 'user',
    };

    const mockJwtSecret = 'test-secret';
    process.env.JWT_SECRET = mockJwtSecret;

    const mockToken = 'mocked-jwt-token';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
      expect(payload.sub).toBe(mockSignData.userId);
      return mockToken;
    });

    const result = generateAuthToken(mockSignData);

    expect(result).toBe(mockToken);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: mockSignData.userId }),
      mockJwtSecret,
      expect.any(Object)
    );
  });
});
