import { z } from 'zod';
import { createUserSchema } from './user.schema';
export const createPracticeAccountSchema = z.object({
  practiceName: z
    .string({
      required_error: 'Practice name is required',
    })
    .min(1, 'Practice name is required')
    .max(255, 'Practice name must be less than 255 characters'),
  address1: z
    .string({
      required_error: 'Address1 is required',
    })
    .min(1, 'Address1 is required')
    .max(255, 'Address1 must be less than 255 characters'),

  address2: z
    .string({
      required_error: 'Address2 is required',
    })
    .min(1, 'Address2 is required')
    .max(255, 'Address2 must be less than 255 characters'),

  city: z
    .string({
      required_error: 'City is required',
    })
    .min(1, 'City is required')
    .max(255, 'City must be less than 255 characters'),

  state: z
    .string({
      required_error: 'State is required',
    })
    .min(1, 'State is required')
    .max(255, 'State must be less than 255 characters'),
  zip: z
    .string({
      required_error: 'Zip is required',
    })
    .min(1, 'Zip is required')
    .max(255, 'Zip must be less than 255 characters'),

  officeEmail: z.string().email({ message: 'Invalid email format' }).optional(),
  officePhone: z
    .string({
      required_error: 'Office phone number is required',
    })
    .min(1, 'Office phone number is required'),

  websiteAddress: z.string(),

  specialityId: z
    .string({
      required_error: 'Specialit id is required',
    })
    .min(1, 'Speciality id is required'),
  specialityName: z
    .string({
      required_error: 'Speciality name is required',
    })
    .min(1, 'Speciality name is required'),

  practiceSoftwareId: z.string().optional(),
  practiceSoftwareName: z.string().optional(),
  countryId: z.string().optional(),
  country: z.string().optional(),
  hasAcceptedTerms: z.boolean().optional(),
});

export const registerPracticeAccountSchema = z.object({
  practiceInfo: createPracticeAccountSchema,
  doctorInfo: createUserSchema,
  userInfo: z.array(createUserSchema),
});

export const updatePracticeAccountSchema = createPracticeAccountSchema.extend({
  id: z.string({
    required_error: 'Id is required',
  }),
});
