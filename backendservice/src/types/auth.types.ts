export interface ILogin {
  id: string;
  readable_id: number;
  user_id: string;
  email_id: string | null;
  is_credential_verified: boolean | null;
  otp_secret: string | null;
  otp: string | null;
  is_2fa_verified?: boolean | null;
  practice_account_id?: string | null;
  remark?: string | null;
  auth_token?: string | null;
  refresh_token?: string | null;
  login_time?: Date | string | null;
  logout_time?: Date | string | null;
}

export interface ILoginRequest {
  emailId: string;
  password: string;
}

export interface ISelectLoginPracticeAccountRequest {
  loginId: string;
  emailId: string;
  practiceAccountId: string;
}

export interface IOtpRequest {
  loginId: string;
  emailId: string;
  otp: string;
}

export interface ILoginCompletionRequest {
  loginId: string;
  userId: string;
  emailId: string;
  practiceAccountId: string;
}

export interface IResendOtpRequest {
  loginId: string;
  emailId: string;
}

export interface IRefreshTokenRequest {
  loginId: string;
  userId: string;
  refreshToken: string;
}

export interface IMeRequest {
  userId: string;
  practiceAccountId: string;
}

export interface ISetPasswordRequest {
  credential: string;
  password: string;
}

export interface IResetPasswordRequest extends ISetPasswordRequest {}

export interface IPasswordCredential {
  sub: string;
  jti: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface ITriggerResetPasswordRequest {
  emailId: string;
}
