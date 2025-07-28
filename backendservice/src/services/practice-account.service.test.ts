// jest.mock('../lib/utils', () => ({
//   getRequestHeaders: jest.fn(),
//   hasUserAccess: jest.fn(),
//   generateHash: jest.fn(),
// }));

// jest.mock('./utils', () => ({
//   getUserRole: jest.fn(),
// }));

// jest.mock('../lib/connections', () => ({
//   sequelize: {
//     query: jest.fn(),
//     define: jest.fn(), // safe no-op
//   },
// }));

// jest.mock('../models/practice-software.model', () => ({
//   PracticeSoftwareModel: {
//     findAll: jest.fn(),
//   },
// }));

// jest.mock('../models/speciality.model', () => ({
//   SpecialityModel: { findAll: jest.fn() },
// }));

// jest.mock('../models/user.model', () => ({
//   UserModel: { create: jest.fn(), findAll: jest.fn() },
// }));

// jest.mock('../models/practice-account.model', () => ({
//   PracticeAccountModel: {
//     create: jest.fn(),
//     findOne: jest.fn(),
//     update: jest.fn(),
//   },
// }));

// jest.mock('../middleware', () => ({
//   errorHandler: jest.fn(),
//   authMiddleware: jest.fn(),
//   validate: jest.fn(),
// }));

// jest.mock('../middleware/audit-log', () => ({
//   AuditLogV2: jest.fn(),
// }));

// jest.mock('../lib/utils/password', () => ({
//   generateHash: jest.fn(),
// }));

// import { APIGatewayProxyEventV2 } from 'aws-lambda';
// import { QueryTypes } from 'sequelize';
// import { sequelize } from '../lib/connections';
// import { DB_ACTIONS, HttpStatus, RESOURCES } from '../lib/enum';
// import { generateHash, getRequestHeaders, hasUserAccess } from '../lib/utils';
// import { authMiddleware, errorHandler, validate } from '../middleware';
// import { AuditLogV2 } from '../middleware/audit-log';
// import { PracticeAccountModel } from '../models/practice-account.model';
// import { PracticeSoftwareModel } from '../models/practice-software.model';
// import { SpecialityModel } from '../models/speciality.model';
// import { UserModel } from '../models/user.model';
// import { updatePracticeAccountSchema } from '../schemas';
// import { EResponseStatus } from '../types';
// import {
//   createPracticeAccount,
//   createUser,
//   getPracticeAccount,
//   getPracticeSoftware,
//   getPracticeSpeciality,
//   isAccountAdminExist,
//   updatePracticeAccount,
// } from './practice-account.service';
// import { getUserRole } from './utils';

// describe('getPracticeSoftware', () => {
//   const mockEvent = {
//     headers: {
//       'practice-account-id': '123',
//       'user-id': '456',
//       'source-ip': '127.0.0.1',
//     },
//     rawPath: '/practice/software',
//     body: '',
//   } as unknown as APIGatewayProxyEventV2;

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should return list of softwares on success', async () => {
//     const mockSoftwareList = [
//       { id: '1', software_name: 'Software A' },
//       { id: '2', software_name: 'Software B' },
//     ];

//     (PracticeSoftwareModel.findAll as jest.Mock).mockResolvedValue(mockSoftwareList);

//     const result = await getPracticeSoftware(mockEvent);

//     expect(PracticeSoftwareModel.findAll).toHaveBeenCalledWith({
//       attributes: ['id', 'software_name'],
//       raw: true,
//     });

//     expect(result).toEqual(mockSoftwareList);
//   });

//   it('should handle error and return error response', async () => {
//     (PracticeSoftwareModel.findAll as jest.Mock).mockRejectedValue(new Error('DB Error'));

//     (errorHandler as jest.Mock).mockReturnValue({
//       statusCode: 500,
//       message: 'Internal Server Error',
//     });

//     const result = await getPracticeSoftware(mockEvent);

//     expect(result).toEqual({
//       statusCode: 500,
//       body: JSON.stringify({
//         statusCode: 500,
//         message: 'Internal Server Error',
//       }),
//     });
//   });
// });

// describe('getPracticeSpeciality', () => {
//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should return list of practice specialities on success', async () => {
//     const mockData = [
//       { id: '1', speciality_name: 'Cardiology' },
//       { id: '2', speciality_name: 'Dermatology' },
//     ];
//     (SpecialityModel.findAll as jest.Mock).mockResolvedValue(mockData);

//     const result = await getPracticeSpeciality();

//     expect(SpecialityModel.findAll).toHaveBeenCalledWith({
//       attributes: ['id', 'speciality_name'],
//       raw: true,
//     });
//     expect(result).toEqual(mockData);
//   });

//   it('should handle errors and return formatted error response', async () => {
//     const mockError = new Error('DB error');
//     (SpecialityModel.findAll as jest.Mock).mockRejectedValue(mockError);

//     const mockHandledError = {
//       statusCode: 500,
//       message: 'Internal server error',
//     };
//     (errorHandler as jest.Mock).mockReturnValue(mockHandledError);

//     const result = await getPracticeSpeciality();

//     expect(errorHandler).toHaveBeenCalledWith(mockError);
//     expect(result).toEqual({
//       statusCode: mockHandledError.statusCode,
//       body: JSON.stringify(mockHandledError),
//     });
//   });
// });

// describe('isAccountAdminExist', () => {
//   const mockRequest = {
//     queryStringParameters: {
//       emailId: 'admin@example.com',
//     },
//   } as unknown as APIGatewayProxyEventV2;

//   const mockAdminUser = [
//     {
//       email_id: 'admin@example.com',
//       role: 'ADMIN',
//     },
//   ];

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should return SUCCESS when no account admin exists with the email', async () => {
//     // Mock empty response
//     (UserModel.findAll as jest.Mock).mockResolvedValue([]);

//     const result = await isAccountAdminExist(mockRequest);

//     expect(result).toEqual({
//       statusCode: HttpStatus.OK,
//       body: JSON.stringify({
//         status: EResponseStatus.SUCCESS,
//         message: 'Account Owner available',
//       }),
//     });

//     expect(UserModel.findAll).toHaveBeenCalledWith({
//       where: { email_id: mockRequest.queryStringParameters?.emailId },
//       raw: true,
//     });
//   });

//   it('should return FAILURE when account admin exists with the email', async () => {
//     jest.clearAllMocks();
//     // Mock response with admin user
//     (UserModel.findAll as jest.Mock).mockResolvedValue(mockAdminUser);

//     const result = await isAccountAdminExist(mockRequest);

//     expect(result).toEqual({
//       statusCode: HttpStatus.OK,
//       body: JSON.stringify({
//         status: EResponseStatus.FAILURE,
//         message: 'Account Owner email already exists',
//       }),
//     });
//   });
// });

// describe('createPracticeAccount', () => {
//   const mockPracticeInfo = {
//     practiceName: 'Test Practice',
//     address1: '123 Main St',
//     address2: '',
//     city: 'Testville',
//     state: 'TS',
//     zip: '12345',
//     officeEmail: 'test@practice.com',
//     officePhone: '123-456-7890',
//     websiteAddress: 'https://testpractice.com',
//     specialityId: '1',
//     specialityName: 'Test Specialty',
//     practiceSoftwareId: '2',
//     practiceSoftwareName: 'Test Software',
//     hasAcceptedTerms: true,
//     countryId: '3',
//     country: 'United States',
//   };

//   const verifyAccount = { hasDea: true };

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should create a new practice account and return the ID', async () => {
//     const mockId = 'mock-id-456';

//     // Mock result.get().id
//     (PracticeAccountModel.create as jest.Mock).mockResolvedValue({
//       get: () => ({ id: mockId }),
//     });

//     const result = await createPracticeAccount(mockPracticeInfo, verifyAccount);

//     expect(PracticeAccountModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         practice_name: mockPracticeInfo.practiceName,
//         address1: mockPracticeInfo.address1,
//         address2: mockPracticeInfo.address2,
//         city: mockPracticeInfo.city,
//         state: mockPracticeInfo.state,
//         zip: mockPracticeInfo.zip,
//         office_email: mockPracticeInfo.officeEmail,
//         office_phone: mockPracticeInfo.officePhone,
//         website_address: mockPracticeInfo.websiteAddress,
//         speciality_id: mockPracticeInfo.specialityId,
//         speciality_name: mockPracticeInfo.specialityName,
//         practice_software_id: mockPracticeInfo.practiceSoftwareId,
//         practice_software_name: mockPracticeInfo.practiceSoftwareName,
//         has_accepted_terms: mockPracticeInfo.hasAcceptedTerms,
//         active_status: true,
//         account_verified: verifyAccount.hasDea,
//       })
//     );

//     expect(result).toEqual({ practiceAccountId: mockId });
//   });

//   it('should throw an error if create fails', async () => {
//     const mockError = new Error('DB Error');
//     (PracticeAccountModel.create as jest.Mock).mockRejectedValue(mockError);

//     await expect(createPracticeAccount(mockPracticeInfo, verifyAccount)).rejects.toThrow('DB Error');
//   });
// });

// describe('createUser', () => {
//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   // Mock user info
//   const mockUserInfo = {
//     practiceAccountId: 'practice123',
//     firstName: 'John',
//     lastName: 'Doe',
//     emailId: 'john@example.com',
//     doctorEmailId: 'docjohn@example.com',
//     phoneNumber: '1234567890',
//     roleId: 'role123',
//     role: 'Doctor',
//     dea: 'AB1234563',
//     licenseNumber: 'LIC123',
//     stateOfIssue: 'CA',
//     password: 'password123',
//     has2fa: false,
//   };

//   it('throws error if Account Admin email already exists', async () => {
//     (sequelize.query as jest.Mock).mockResolvedValueOnce([{}]); // User exists
//     const userRole = { isAccountOwner: true };

//     await expect(createUser(mockUserInfo, userRole)).rejects.toThrow(
//       `Account Owner email '${mockUserInfo.emailId}' already exists`
//     );

//     expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining(mockUserInfo.emailId), {
//       type: QueryTypes.SELECT,
//     });
//     expect(UserModel.create).not.toHaveBeenCalled();
//   });

//   it('throws error if regular user email already exists', async () => {
//     (sequelize.query as jest.Mock).mockResolvedValueOnce([{}]); // User exists
//     const userRole = { isAccountOwner: false };

//     await expect(createUser(mockUserInfo, userRole)).rejects.toThrow(
//       `User email '${mockUserInfo.emailId}' already exists`
//     );

//     expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining(mockUserInfo.emailId), {
//       type: QueryTypes.SELECT,
//     });
//     expect(UserModel.create).not.toHaveBeenCalled();
//   });

//   it('creates user with correct accountVerified for Doctor with DEA', async () => {
//     (sequelize.query as jest.Mock).mockResolvedValueOnce([]); // User does not exist
//     (generateHash as jest.Mock).mockResolvedValueOnce('hashedPassword');
//     (UserModel.create as jest.Mock).mockResolvedValueOnce({
//       get: () => ({ id: 'user123' }),
//     });

//     const userRole = { isAccountOwner: false };
//     const result = await createUser(mockUserInfo, userRole);

//     expect(generateHash).toHaveBeenCalledWith(mockUserInfo.password);
//     expect(UserModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         account_verified: true,
//         password: 'hashedPassword',
//         has_2fa: false,
//       })
//     );
//     expect(result).toEqual({ userId: 'user123' });
//   });

//   it('creates user with correct accountVerified for Doctor without DEA (should be false)', async () => {
//     (sequelize.query as jest.Mock).mockResolvedValueOnce([]);
//     (generateHash as jest.Mock).mockResolvedValueOnce('hashedPassword');
//     (UserModel.create as jest.Mock).mockResolvedValueOnce({
//       get: () => ({ id: 'user456' }),
//     });

//     const userRole = { isAccountOwner: false };
//     const userInfo = { ...mockUserInfo, dea: '' }; // No DEA
//     const result = await createUser(userInfo, userRole);

//     expect(UserModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         account_verified: false,
//       })
//     );
//     expect(result).toEqual({ userId: 'user456' });
//   });

//   it('creates user with correct accountVerified for non-Doctor role (should be true)', async () => {
//     (sequelize.query as jest.Mock).mockResolvedValueOnce([]);
//     (generateHash as jest.Mock).mockResolvedValueOnce('hashedPassword');
//     (UserModel.create as jest.Mock).mockResolvedValueOnce({
//       get: () => ({ id: 'user789' }),
//     });

//     const userRole = { isAccountOwner: false };
//     const userInfo = { ...mockUserInfo, role: 'Staff', dea: '' };
//     const result = await createUser(userInfo, userRole);

//     expect(UserModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         account_verified: true,
//       })
//     );
//     expect(result).toEqual({ userId: 'user789' });
//   });

//   it('throws error if UserModel.create fails', async () => {
//     (sequelize.query as jest.Mock).mockResolvedValueOnce([]);
//     (generateHash as jest.Mock).mockResolvedValueOnce('hashedPassword');
//     (UserModel.create as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

//     const userRole = { isAccountOwner: false };

//     await expect(createUser(mockUserInfo, userRole)).rejects.toThrow('DB error');
//   });

//   it('creates user with has_2fa false if 2fa is not selected', async () => {
//     (sequelize.query as jest.Mock).mockResolvedValueOnce([]);
//     (generateHash as jest.Mock).mockResolvedValueOnce('hashedPassword');
//     (UserModel.create as jest.Mock).mockResolvedValueOnce({
//       get: () => ({ id: 'user101' }),
//     });

//     const userRole = { isAccountOwner: false };
//     const userInfo = { ...mockUserInfo, emailId: '' };
//     const result = await createUser(userInfo, userRole);

//     expect(UserModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         has_2fa: false,
//       })
//     );
//     expect(result).toEqual({ userId: 'user101' });
//   });
// });

// describe('getPracticeAccount', () => {
//   const mockRequest = {
//     queryStringParameters: {
//       id: '123',
//     },
//   } as unknown as APIGatewayProxyEventV2;

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should return practice account when found', async () => {
//     const mockRequest = {
//       queryStringParameters: {
//         id: '123',
//       },
//       headers: {
//         'practice-account-id': 'practice123',
//         'user-id': 'user123',
//       },
//     } as unknown as APIGatewayProxyEventV2;

//     const mockPracticeAccount = {
//       id: '123',
//       practice_name: 'Test Practice',
//       active_status: true,
//     };

//     (getRequestHeaders as jest.Mock).mockReturnValue({
//       requesterPracticeId: 'practice123',
//       requesterUserId: 'user123',
//     });

//     (authMiddleware as jest.Mock).mockResolvedValue(undefined);

//     (getUserRole as jest.Mock).mockResolvedValue('ADMIN');

//     (hasUserAccess as jest.Mock).mockReturnValue(true);

//     (PracticeAccountModel.findOne as jest.Mock).mockResolvedValue(mockPracticeAccount);

//     const result = await getPracticeAccount(mockRequest);

//     expect(result).toEqual({
//       statusCode: HttpStatus.OK,
//       body: JSON.stringify(mockPracticeAccount),
//     });

//     expect(getRequestHeaders).toHaveBeenCalledWith(mockRequest);
//     expect(authMiddleware).toHaveBeenCalledWith(mockRequest);
//     expect(getUserRole).toHaveBeenCalledWith('practice123', 'user123');
//     expect(hasUserAccess).toHaveBeenCalledWith('ADMIN', RESOURCES.MANAGE_PRACTICE_ACCOUNT, DB_ACTIONS.VIEW);
//     expect(PracticeAccountModel.findOne).toHaveBeenCalledWith({
//       where: { id: '123', active_status: true },
//       raw: true,
//     });
//     expect(AuditLogV2).toHaveBeenCalledWith({
//       request: mockRequest,
//       response: mockPracticeAccount,
//     });
//   });

//   it('should return empty response when practice account not found', async () => {
//     // Mock the model response with null
//     (PracticeAccountModel.findOne as jest.Mock).mockResolvedValue(null);

//     const result = await getPracticeAccount(mockRequest);

//     expect(result).toEqual({
//       statusCode: HttpStatus.OK,
//       body: JSON.stringify(null),
//     });

//     expect(AuditLogV2).toHaveBeenCalled();
//   });
// });

// describe('updatePracticeAccount', () => {
//   const mockRequest = {
//     body: JSON.stringify({
//       id: '123',
//       practiceName: 'Test Practice',
//       address1: '123 Main St',
//       address2: 'Suite 100',
//       city: 'Testville',
//       state: 'TS',
//       zip: '12345',
//       officeEmail: 'test@practice.com',
//       officePhone: '555-123-4567',
//       websiteAddress: 'https://testpractice.com',
//       specialityId: '1',
//       specialityName: 'General',
//       practiceSoftwareId: '2',
//       practiceSoftwareName: 'SoftwareX',
//       hasAcceptedTerms: true,
//       countryId: '1',
//       country: 'United States',
//     }),
//     headers: {
//       'user-id': 'user-123',
//     },
//   } as unknown as APIGatewayProxyEventV2;

//   const mockResponse = {
//     message: 'Practice account updated successfully',
//     status: EResponseStatus.SUCCESS,
//     id: '123',
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();
//     // Mock successful auth middleware
//     (authMiddleware as jest.Mock).mockResolvedValue(undefined);
//     // Mock successful validation
//     (validate as jest.Mock).mockReturnValue(undefined);
//     // Mock successful update
//     (PracticeAccountModel.update as jest.Mock).mockResolvedValue([1]);
//     // Mock successful audit log
//     (AuditLogV2 as jest.Mock).mockResolvedValue(undefined);
//   });

//   it('should successfully update a practice account', async () => {
//     const result = await updatePracticeAccount(mockRequest);

//     expect(result).toEqual({
//       statusCode: HttpStatus.OK,
//       body: JSON.stringify(mockResponse),
//     });

//     expect(authMiddleware).toHaveBeenCalledWith(mockRequest);
//     expect(validate).toHaveBeenCalledWith(updatePracticeAccountSchema, JSON.parse(mockRequest.body as string));

//     expect(PracticeAccountModel.update).toHaveBeenCalledWith(
//       {
//         practice_name: 'Test Practice',
//         address1: '123 Main St',
//         address2: 'Suite 100',
//         city: 'Testville',
//         state: 'TS',
//         zip: '12345',
//         office_email: 'test@practice.com',
//         office_phone: '555-123-4567',
//         website_address: 'https://testpractice.com',
//         speciality_id: '1',
//         speciality_name: 'General',
//         practice_software_id: '2',
//         practice_software_name: 'SoftwareX',
//         has_accepted_terms: true,
//         country_id: '1',
//         country: 'United States',
//         updated_at: expect.any(Date),
//         updated_by: 'user-123',
//       },
//       {
//         where: { id: '123' },
//       }
//     );

//     expect(AuditLogV2).toHaveBeenCalledWith({
//       request: mockRequest,
//       response: mockResponse,
//     });
//   });

//   it('should handle authentication failure', async () => {
//     const authError = new Error('Unauthorized');
//     (authMiddleware as jest.Mock).mockRejectedValue(authError);

//     // Mock the error handler response
//     const mockErrorResponse = {
//       statusCode: HttpStatus.UNAUTHORIZED,
//       message: 'Unauthorized',
//     };
//     (errorHandler as jest.Mock).mockReturnValue(mockErrorResponse);

//     const result = await updatePracticeAccount(mockRequest);

//     expect(result).toEqual({
//       statusCode: HttpStatus.UNAUTHORIZED,
//       body: JSON.stringify(mockErrorResponse),
//     });

//     expect(AuditLogV2).toHaveBeenCalledWith({
//       request: mockRequest,
//       response: {
//         statusCode: HttpStatus.UNAUTHORIZED,
//         body: JSON.stringify(mockErrorResponse),
//       },
//       error_message: 'Unauthorized',
//     });
//   });

//   it('should handle validation errors', async () => {
//     const validationError = new Error('Validation failed');
//     (validate as jest.Mock).mockImplementation(() => {
//       throw validationError;
//     });

//     const mockErrorResponse = {
//       statusCode: HttpStatus.BAD_REQUEST,
//       message: 'Validation failed',
//     };
//     (errorHandler as jest.Mock).mockReturnValue(mockErrorResponse);

//     const result = await updatePracticeAccount(mockRequest);

//     expect(result).toEqual({
//       statusCode: HttpStatus.BAD_REQUEST,
//       body: JSON.stringify(mockErrorResponse),
//     });
//   });
// });
