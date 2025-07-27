import { authenticator, totp } from 'otplib';
import { generateOtp } from './generate-otp';

// Mock the otplib module
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn().mockReturnValue('mock-secret-key'),
  },
  totp: {
    options: {},
    generate: jest.fn().mockReturnValue('123456'),
  },
}));

describe('generateOtp', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  it('should generate an OTP with correct length and secret', () => {
    const result = generateOtp();

    expect(result).toEqual({
      otp: '123456',
      secret: 'mock-secret-key',
    });

    // Verify authenticator.generateSecret was called
    expect(authenticator.generateSecret).toHaveBeenCalled();

    // Verify totp.generate was called with the secret
    expect(totp.generate).toHaveBeenCalledWith('mock-secret-key');

    // Verify TOTP options were set correctly
    expect(totp.options).toEqual({
      step: 30,
      digits: 6,
      window: 1,
    });
  });

  it('should always generate a 6-digit OTP', () => {
    const result = generateOtp();
    expect(result.otp).toHaveLength(6);
    expect(/^\d{6}$/.test(result.otp)).toBe(true);
  });

  it('should generate a new secret each time', () => {
    // Mock generateSecret to return different values
    (authenticator.generateSecret as jest.Mock).mockReturnValueOnce('secret-1').mockReturnValueOnce('secret-2');

    const result1 = generateOtp();
    const result2 = generateOtp();

    expect(result1.secret).toBe('secret-1');
    expect(result2.secret).toBe('secret-2');
    expect(result1.secret).not.toBe(result2.secret);
  });

  it('should use correct TOTP configuration', () => {
    generateOtp();

    // Verify the TOTP options are set correctly
    expect(totp.options).toEqual({
      step: 30, // 30-second validity
      digits: 6, // 6-digit code
      window: 1, // 1-step window
    });
  });

  it('should generate different OTPs for different secrets', () => {
    // Mock generate to return different OTPs
    (totp.generate as jest.Mock).mockReturnValueOnce('111111').mockReturnValueOnce('222222');

    (authenticator.generateSecret as jest.Mock).mockReturnValueOnce('secret-A').mockReturnValueOnce('secret-B');

    const result1 = generateOtp();
    const result2 = generateOtp();

    expect(result1.otp).toBe('111111');
    expect(result2.otp).toBe('222222');
  });
});
