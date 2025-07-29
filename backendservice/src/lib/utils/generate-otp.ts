import { authenticator, totp } from 'otplib';

export const generateOtp = (): { otp: string; secret: string } => {
  const secret = authenticator.generateSecret();
  totp.options = {
    step: 30, // OTP valid duration (in seconds)
    digits: 6, // Length of the OTP
    window: 1, // additional time steps to check
  };
  const otp = totp.generate(secret);
  return { otp, secret };
};
