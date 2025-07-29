import { IListQuery, IPagination } from './common.types';

export interface IPatient {
  id: string; // UUID as string
  practice_account_id: string; // UUID as string
  user_id: string | null; // UUID as string, optional
  readable_id: number;
  first_name: string;
  last_name: string;
  dob: string; // Date as ISO string, or Date if parsed
  email_id: string | null;
  phone_number: string | null;
  place_holder1: string | null;
  place_holder2: string | null;
  place_holder3: string | null;
  active_status: boolean | null;
  created_by: string | null; // UUID as string
  updated_by: string | null; // UUID as string
  created_at: string | null; // Timestamp as ISO string, or Date if parsed
  updated_at: string | null; // Timestamp as ISO string, or Date if parsed
}

export interface ICreatePatientRequest {
  firstName: string;
  lastName: string;
  dob: string;
  emailId: string | null;
  phoneNumber: string | null;
}

export interface IUpdatePatientRequest extends ICreatePatientRequest {
  id: string;
}

export interface IDeletePatientRequest {
  id: string;
}

export interface IGetPatientRequest {
  id: string;
}

export interface IGetAllPatientRequest extends IPagination, IListQuery {
  practiceAccountId: string;
}

export interface ISearchPatientRequest {
  firstName: string;
  lastName: string;
  dob: string;
}
