import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string({
    required_error: 'First name is required',
  }),
  lastName: z.string({
    required_error: 'Last name is required',
  }),
  dob: z.string({
    required_error: 'DOB is required',
  }),
  emailId: z.string().email({ message: 'Invalid email format' }).optional(),
  phoneNumber: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.extend({
  id: z.string({
    required_error: 'Id is required',
  }),
});

export const patientListSchema = z.object({
  practiceAccountId: z.string({
    required_error: 'Practice account id is required',
  }),
  limit: z.number({
    required_error: 'Limit is required',
  }),
  page: z.number({
    required_error: 'Page is required',
  }),
});

export const patientSearchSchema = z.object({
  dob: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});
