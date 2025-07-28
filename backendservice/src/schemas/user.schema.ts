import { z } from 'zod';
import { validateDEA } from '../lib/utils';

const baseUserSchema = z.object({
  practiceAccountId: z.string().optional(),
  firstName: z
    .string({
      required_error: 'Practice name is required',
    })
    .min(1, 'First name is required')
    .max(255, 'First name must be less than 255 characters'),

  lastName: z
    .string({
      required_error: 'Last name is required',
    })
    .min(1, 'Last name is required')
    .max(255, 'Last name must be less than 255 characters'),

  emailId: z
    .string({
      required_error: 'Email is required',
    })
    .email({ message: 'Invalid email format' }),

  has2fa: z.boolean().optional(),

  phoneNumber: z.string(),

  roleId: z
    .string({
      required_error: 'Role id is required',
    })
    .min(1, 'Role id is required'),
  role: z
    .string({
      required_error: 'Role name is required',
    })
    .min(1, 'Role name is required'),

  dea: z.string().optional(),

  licenseNumber: z.string().optional(),
  stateId: z.string().optional(),
  stateOfIssue: z.string().optional(),
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

  doctorEmailId: z.string().email({ message: 'Invalid email format' }).optional(),
});

export const createUserSchema = baseUserSchema.superRefine((data, ctx) => {
  // Only validate if DEA is provided
  if (data.dea && data.dea.length > 0) {
    // Pass both DEA and lastName to your validation function
    if (!validateDEA(data.dea, data.lastName)) {
      ctx.addIssue({
        path: ['dea'],
        code: z.ZodIssueCode.custom,
        message: 'Invalid DEA number',
      });
    }
  }
});

export const updateUserSchema = baseUserSchema
  .extend({
    id: z.string({
      required_error: 'Id is required',
    }),
  })
  .superRefine((data, ctx) => {
    // Only validate if DEA is provided
    if (data.dea && data.dea.length > 0) {
      // Pass both DEA and lastName to your validation function
      if (!validateDEA(data.dea, data.lastName)) {
        ctx.addIssue({
          path: ['dea'],
          code: z.ZodIssueCode.custom,
          message: 'Invalid DEA number',
        });
      }
    }
  });

export const userListSchema = z.object({
  practiceAccountId: z.string({
    required_error: 'Practice account id is required',
  }),
  limit: z.number({
    required_error: 'Limit is required',
  }),
  page: z.number({
    required_error: 'Page is required',
  }),
  role: z.string({
    required_error: 'Role is required',
  }),
});
