import { IApiResponse, ResponseStatus } from './common.types';
import { ICreateUserRequest } from './user.types';

export interface IPracticeAccount {
  id: string;
  readable_id: string;
  practice_name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  office_email: string;
  office_phone: string;
  website_address: string;
  speciality_id: string;
  speciality_name: string;
  practice_software_id: string;
  practice_software_name: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  has_accepted_terms: boolean;
  active_status: boolean;
  account_verified: boolean;
}

export interface ICreatePracticeAccountRequest {
  practiceName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  officeEmail: string;
  officePhone: string;
  websiteAddress: string;

  specialityId: string;
  specialityName: string;

  practiceSoftwareId: string;
  practiceSoftwareName: string;

  hasAcceptedTerms: boolean;
  countryId: string;
  country: string;
}

export interface ICreatePracticeAccountResponse extends IApiResponse {
  message: string;
  status: ResponseStatus;
  id: string;
}

export interface IUpdatePracticeAccountRequest extends ICreatePracticeAccountRequest {
  id: string;
}

export interface IUpdatePracticeAccountResponse extends IApiResponse {
  message: string;
  status: ResponseStatus;
  id: string;
}

export interface IRegisterPracticeAccountRequest {
  practiceInfo: ICreatePracticeAccountRequest;
  doctorInfo: ICreateUserRequest;
  userInfo: ICreateUserRequest[];
}

export interface IRegisterPracticeAccountResponse {
  message: string;
  status: ResponseStatus;
}

export interface IPracticeSpecialityResponse {
  id: string;
  speciality_name: string;
}

export interface IPracticeSoftwareResponse {
  id: string;
  speciality_name: string;
}

export interface isPracticeNameExistRequest {
  practiceName: string;
}

export interface isAccountAdminExistRequest {
  emailId: string;
}

export interface IPraciceAccountUpdateRequest extends ICreatePracticeAccountRequest {
  id: string;
}

export interface IGetPracticeAccountRequest {
  id: string;
}
