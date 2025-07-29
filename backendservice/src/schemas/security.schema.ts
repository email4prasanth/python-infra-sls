import { z } from 'zod';

export const securityUpdateSchema = z.object({
  emailId: z
    .string({
      required_error: 'Email is required',
    })
    .email({ message: 'Invalid email format' }),

  phoneNumber: z.string({
    required_error: 'Phone number is required',
  }),
});
