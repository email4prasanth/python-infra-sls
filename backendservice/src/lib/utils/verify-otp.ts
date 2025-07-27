import { totp } from 'otplib';

export const verifyOtp = (otp: string, secret: string): boolean => {
  return totp.check(otp, secret);
};
