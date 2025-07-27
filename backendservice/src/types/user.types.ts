import { IListQuery, IPagination } from './common.types';

export interface IUserAccount {
  id: string;
  readable_id: string;
  first_name: string;
  last_name: string;
  email_id: string;
  phone_number: string;
  password: string;
  active_status: boolean;
  is_password_active: boolean;
  password_reset_at: string;
  is_paassword_reset: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IPracticeUser {
  id: string;
  readable_id: string;
  practice_account_id: string;
  user_id: string;
  has_2fa: boolean;
  role_id: string;
  role: string;
  dea: string;
  license_number: string;
  state_id: string | null;
  state_of_issue: string;
  password: string;
  account_verified: string;
  active_status: boolean;

  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  doctor_email_id?: string | null;
}

export interface IUser {
  id: string;
  readable_id: string;
  practice_account_id: string;
  first_name: string;
  last_name: string;
  email_id: string;
  phone_number: string;
  role_id: string;
  role: string;
  dea: string;
  license_number: string;
  state_id: string;
  state_of_issue: string;
  password: string;
  has_2fa: boolean;
  active_status: boolean;
  account_verified: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  doctor_email_id: string;
}

export interface ICreateUserRequest {
  practiceAccountId?: string;
  firstName: string;
  lastName: string;
  emailId: string;
  has2fa: boolean;
  doctorEmailId?: string;
  phoneNumber: string;
  roleId: string;
  role: string;
  dea: string;
  licenseNumber: string;
  stateId: string;
  stateOfIssue: string;
  password?: string;
}

export interface ICreateUserResponse {
  message: string;
  status: string;
}

export interface IUpdateUserRequest extends ICreateUserRequest {
  id: string;
}

export interface IUpdateUserResponse {
  message: string;
  status: string;
  id: string;
}

export interface IDeleteUserRequest {
  userId: string;
}

export interface IDeleteUserResponse {
  message: string;
  status: string;
}

export interface IUserRoleResponse {
  id: string;
  role_name: string;
}

export enum ROLES_TO_ACCESS {
  ALL = 'All',
  ACCOUNT_OWNER = 'Account Owner',
  ADMIN = 'Admin',
  DOCTOR = 'Doctor',
  STAFF = 'Staff',
  PATIENT = 'Patient',
  SYSTEM_ADMIN = 'System Admin',
}

export interface IGetAllUsersRequest extends IPagination, IListQuery {
  practiceAccountId: string;
  role: ROLES_TO_ACCESS;
}

export interface IGetUserRequest {
  userId: string;
}
