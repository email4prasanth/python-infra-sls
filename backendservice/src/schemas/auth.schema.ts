import { z } from 'zod';

export const loginSchema = z.object({
  emailId: z
    .string({
      required_error: 'Email is required',
    })
    .email({
      message: 'Invalid Email ID',
    }),

  password: z.string({
    required_error: 'Password is required',
  }),
});

export const verifyOtpSchema = z.object({
  loginId: z.string({
    required_error: 'Login ID is required',
  }),
  emailId: z
    .string({
      required_error: 'Email ID is required',
    })
    .email({
      message: 'Invalid Email ID',
    }),
  otp: z.string({
    required_error: 'OTP is required',
  }),
});

export const loginCompletionSchema = z.object({
  loginId: z.string({
    required_error: 'Login ID is required',
  }),
  userId: z.string({
    required_error: 'User ID is required',
  }),
  emailId: z
    .string({
      required_error: 'Email ID is required',
    })
    .email({
      message: 'Invalid Email ID',
    }),
  practiceAccountId: z.string({
    required_error: 'Practice Account ID is required',
  }),
});

export const selectLoginPracticeAccountSchema = z.object({
  loginId: z.string({
    required_error: 'Login ID is required',
  }),
  emailId: z.string({
    required_error: 'Email ID is required',
  }),
  practiceAccountId: z.string({
    required_error: 'Practice Account ID is required',
  }),
});

export const resendOtpSchema = z.object({
  loginId: z.string({
    required_error: 'Login ID is required',
  }),
  emailId: z
    .string({
      required_error: 'Email ID is required',
    })
    .email({
      message: 'Invalid Email ID',
    }),
});

export const refreshTokenSchema = z.object({
  loginId: z.string({
    required_error: 'Login ID is required',
  }),
  userId: z.string({
    required_error: 'User ID is required',
  }),
  refreshToken: z.string({
    required_error: 'Refresh Token is required',
  }),
});

export const meSchema = z.object({
  practiceAccountId: z.string({
    required_error: 'Practice ID is required',
  }),
  userId: z.string({
    required_error: 'User ID is required',
  }),
});

export const setPasswordSchema = z.object({
  credential: z.string({
    required_error: 'Credential is missing',
  }),
  password: z
    .string()
    .min(8, 'Password must be 8 characters')
    .refine((val) => /(?=.*[0-9])/.test(val), {
      message: 'Password must contain atleast one number',
    })
    .refine((val) => /(?=.*[!@#$%^&*])/.test(val), {
      message: 'Password must contain atleast one symbol',
    })
    .optional(),
});

export const resetPasswordSchema = setPasswordSchema.extend({});

export const triggerResetPasswordSchema = z.object({
  emailId: z
    .string({
      required_error: 'Email ID is required',
    })
    .email({
      message: 'Invalid Email ID',
    }),
});
