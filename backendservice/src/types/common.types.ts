export enum EResponseStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export type ResponseStatus = EResponseStatus.SUCCESS | EResponseStatus.FAILURE;

export interface IApiResponse {
  status: ResponseStatus;
  message: string;
}

export interface IRequestHeaders {
  requesterSourceIp: string;
  requesterLoginId: string;
  requesterPracticeId: string;
  requesterUserId: string;
}

export interface IJwtSignature {
  userId: string;
  loginId: string;
  email: string;
  role: string;
}

export interface IJwtDecode {
  sub: string;
  jti: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface IPaginationResult {
  currentPage: number;
  rowsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number | null;
  previousPage: number | null;
}

export interface IPagination {
  limit: number;
  page: number;
}

export interface IListQuery {
  filter?: { [key: string]: string | number | boolean };
  sort?: { [key: string]: 'asc' | 'desc' };
  search?: string;
}
