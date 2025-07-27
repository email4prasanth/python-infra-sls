// import { APIGatewayProxyEventV2 } from 'aws-lambda';
// import { sequelize } from '../lib/connections';
// // import { HttpStatus } from '../lib/enum';
// // import { AppError } from '../lib/error';
// import {
//   getRequestHeaders,
//   // getRequestHeaders,
//   hasUserAccess,
// } from '../lib/utils';
// // import { authMiddleware, errorHandler, validate } from '../middleware';
// // import { AuditLogV2 } from '../middleware/audit-log';
import { RoleModel } from '../models';
// // import { updateUserSchema } from '../schemas';
import { getUserRoleList } from '../services/user.service';
// // import { EResponseStatus, ICreateUserRequest } from '../types';
// import {
//   // getPaginatedData,
//   getUserRole,
//   sendEmailNotification,
// } from './utils';
// // import { Op } from 'sequelize';

// import { DB_ACTIONS, HttpStatus, RESOURCES } from '../lib/enum';
// import { authMiddleware } from '../middleware';
// import { EResponseStatus } from '../types';

// jest.mock('../lib/utils', () => ({
//   getRequestHeaders: jest.fn(),
//   hasUserAccess: jest.fn(),
// }));
// jest.mock('../middleware', () => ({
//   authMiddleware: jest.fn(),
//   validate: jest.fn(),
//   errorHandler: jest.fn(),
// }));
// jest.mock('../middleware/audit-log', () => ({
//   AuditLogV2: jest.fn(),
// }));

jest.mock('../models/role.model', () => ({
  RoleModel: {
    findAll: jest.fn(),
  },
}));

// jest.mock('../models/user.model', () => ({
//   UserModel: {
//     create: jest.fn(),
//     update: jest.fn(),
//     findAndCountAll: jest.fn(),
//     findOne: jest.fn(),
//     findAll: jest.fn(),
//   },
// }));

// jest.mock('../models/practice-user.model', () => ({
//   PracticeUserModel: {
//     create: jest.fn(),
//     update: jest.fn(),
//     findAndCountAll: jest.fn(),
//     findOne: jest.fn(),
//     findAll: jest.fn(),
//   },
// }));

// jest.mock('../lib/connections', () => ({
//   sequelize: {
//     query: jest.fn(),
//     define: jest.fn(),
//   },
// }));
// jest.mock('./utils', () => ({
//   getUserRole: jest.fn(),
//   getPaginatedData: jest.fn(),
//   userRoleFilter: jest.fn(),
//   sendEmailNotification: jest.fn(),
// }));

describe('getUserRoleList', () => {
  it('should return a list of user roles when the database query is successful', async () => {
    const mockRoles = [
      { id: '1', role_name: 'Admin' },
      { id: '2', role_name: 'User' },
    ];

    (RoleModel.findAll as jest.Mock).mockResolvedValue(mockRoles);

    const result = await getUserRoleList();

    expect(RoleModel.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'role_name'],
      raw: true,
    });
    expect(result).toEqual(mockRoles);
  });
});

// describe('createUser function', () => {
//   const mockEvent = {
//     body: JSON.stringify({
//       dea: 'DEA123',
//       emailId: 'test@example.com',
//       firstName: 'John',
//       has2fa: true,
//       lastName: 'Doe',
//       licenseNumber: 'LIC123',
//       phoneNumber: '1234567890',
//       role: 'Doctor',
//       roleId: 1,
//       stateId: 1,
//       stateOfIssue: 'CA',
//     }),
//     headers: {
//       'requester-practice-id': 'practice-123',
//       'requester-user-id': 'user-456',
//     },
//   } as unknown as APIGatewayProxyEventV2;

//   const mockUserResult = {
//     get: () => ({ id: 'new-user-123' }),
//   };

//   beforeEach(() => {
//     jest.clearAllMocks();

//     // Setup default mock implementations
//     (getRequestHeaders as jest.Mock).mockReturnValue({
//       requesterPracticeId: 'practice-123',
//       requesterUserId: 'user-456',
//     });
//     (authMiddleware as jest.Mock).mockResolvedValue(true);
//     (getUserRole as jest.Mock).mockResolvedValue('Admin');
//     (hasUserAccess as jest.Mock).mockReturnValue(true);
//     (sequelize.query as jest.Mock).mockResolvedValue([]);
//     (UserModel.findAll as jest.Mock).mockResolvedValue([]);
//     (UserModel.create as jest.Mock).mockResolvedValue(mockUserResult);
//     (PracticeUserModel.create as jest.Mock).mockResolvedValue({});
//     (sendEmailNotification as jest.Mock).mockResolvedValue(true);
//   });

//   it('should successfully create a new user', async () => {
//     const result = await createUser(mockEvent);

//     expect(result.statusCode).toBe(HttpStatus.OK);
//     const body = JSON.parse(result.body);
//     expect(body.status).toBe(EResponseStatus.SUCCESS);
//     expect(body.message).toBe('User created successfully');

//     // Verify mocks were called correctly
//     expect(authMiddleware).toHaveBeenCalledWith(mockEvent);
//     expect(getUserRole).toHaveBeenCalledWith('practice-123', 'user-456');
//     expect(hasUserAccess).toHaveBeenCalledWith('Admin', RESOURCES.MANAGE_USER, DB_ACTIONS.INSERT);
//     expect(sequelize.query).toHaveBeenCalledWith(expect.any(String), {
//       type: 'SELECT',
//       replacements: {
//         emailId: 'test@example.com',
//         practiceAccountId: 'practice-123',
//       },
//     });
//     expect(UserModel.create).toHaveBeenCalledWith({
//       first_name: 'John',
//       last_name: 'Doe',
//       email_id: 'test@example.com',
//       phone_number: '1234567890',
//       password: '',
//       active_status: true,
//       created_at: expect.any(Date),
//       created_by: 'user-456',
//     });
//     expect(PracticeUserModel.create).toHaveBeenCalledWith({
//       practice_account_id: 'practice-123',
//       user_id: 'new-user-123',
//       has_2fa: true,
//       role_id: 1,
//       role: 'Doctor',
//       dea: 'DEA123',
//       license_number: 'LIC123',
//       state_id: 1,
//       state_of_issue: 'CA',
//       account_verified: 'verified',
//       active_status: true,
//       created_at: expect.any(Date),
//       created_by: 'user-456',
//     });
//     expect(sendEmailNotification).toHaveBeenCalledWith({
//       userId: 'new-user-123',
//       practiceId: 'practice-123',
//       userName: 'John Doe',
//       email: 'test@example.com',
//       role: 'Doctor',
//       template: 'SET_PASSWORD',
//     });
//   });

//   it('should use existing password if user email exists', async () => {
//     (UserModel.findAll as jest.Mock).mockResolvedValue([
//       {
//         password: 'existing-hash',
//       },
//     ]);

//     await createUser(mockEvent);

//     expect(UserModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         password: 'existing-hash',
//       })
//     );
//     expect(sendEmailNotification).toHaveBeenCalledWith(
//       expect.objectContaining({
//         template: 'INVITATION',
//       })
//     );
//   });

//   it('should set account_verified to pending for Doctor without DEA', async () => {
//     const doctorEvent = {
//       ...mockEvent,
//       body: JSON.stringify({
//         ...JSON.parse(mockEvent.body as string),
//         dea: null,
//         role: 'Doctor',
//       }),
//     };

//     await createUser(doctorEvent);

//     expect(PracticeUserModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         account_verified: 'pending',
//       })
//     );
//   });

//   it('should set account_verified to verified for non-Doctor roles', async () => {
//     const staffEvent = {
//       ...mockEvent,
//       body: JSON.stringify({
//         ...JSON.parse(mockEvent.body as string),
//         role: 'Staff',
//       }),
//     };

//     await createUser(staffEvent);

//     expect(PracticeUserModel.create).toHaveBeenCalledWith(
//       expect.objectContaining({
//         account_verified: 'verified',
//       })
//     );
//   });

//   it('should handle validation errors', async () => {
//     const invalidEvent = {
//       ...mockEvent,
//       body: JSON.stringify({
//         // Missing required fields
//       }),
//     };

//     try {
//       await createUser(invalidEvent);
//     } catch (err) {
//       expect(err).toBe(HttpStatus.BAD_REQUEST);
//     }
//   });
// });

// describe('updateUser function', () => {
//   const mockEvent = {
//     body: JSON.stringify({
//       id: 'user-123',
//       dea: 'DEA456',
//       emailId: 'updated@example.com',
//       firstName: 'Updated',
//       has2fa: false,
//       lastName: 'User',
//       licenseNumber: 'LIC456',
//       phoneNumber: '9876543210',
//       role: 'Staff',
//       roleId: 2,
//       stateId: 2,
//       stateOfIssue: 'NY',
//     }),
//     headers: {
//       'requester-practice-id': 'practice-123',
//       'requester-user-id': 'user-456',
//     },
//   } as unknown as APIGatewayProxyEventV2;

//   beforeEach(() => {
//     jest.clearAllMocks();

//     // Setup default mock implementations
//     (getRequestHeaders as jest.Mock).mockReturnValue({
//       requesterPracticeId: 'practice-123',
//       requesterUserId: 'user-456',
//     });
//     (authMiddleware as jest.Mock).mockResolvedValue(true);
//     (getUserRole as jest.Mock).mockResolvedValue('Admin');
//     (hasUserAccess as jest.Mock).mockReturnValue(true);
//     (UserModel.update as jest.Mock).mockResolvedValue([1]);
//     (PracticeUserModel.update as jest.Mock).mockResolvedValue([1]);
//   });

//   it('should successfully update user details', async () => {
//     const result = await updateUser(mockEvent);

//     expect(result.statusCode).toBe(HttpStatus.OK);
//     const body = JSON.parse(result.body);
//     expect(body.status).toBe(EResponseStatus.SUCCESS);
//     expect(body.message).toBe('User updated successfully');

//     // Verify UserModel.update was called correctly
//     expect(UserModel.update).toHaveBeenCalledWith(
//       {
//         first_name: 'Updated',
//         last_name: 'User',
//         email_id: 'updated@example.com',
//         phone_number: '9876543210',
//         updated_at: expect.any(Date),
//         updated_by: 'user-456',
//       },
//       {
//         where: {
//           id: 'user-123',
//         },
//       }
//     );

//     // Verify PracticeUserModel.update was called correctly
//     expect(PracticeUserModel.update).toHaveBeenCalledWith(
//       {
//         practice_account_id: 'practice-123',
//         has_2fa: false,
//         role_id: 2,
//         role: 'Staff',
//         dea: 'DEA456',
//         license_number: 'LIC456',
//         state_id: 2,
//         state_of_issue: 'NY',
//         active_status: true,
//         updated_at: expect.any(Date),
//         updated_by: 'user-456',
//       },
//       {
//         where: {
//           user_id: 'user-123',
//           practice_account_id: 'practice-123',
//         },
//       }
//     );
//   });

//   it('should handle validation errors', async () => {
//     const invalidEvent = {
//       ...mockEvent,
//       body: JSON.stringify({
//         // Missing required fields
//       }),
//     };

//     try {
//       await updateUser(invalidEvent);
//     } catch (err) {
//       expect(err).toBe(HttpStatus.BAD_REQUEST);
//     }
//   });

//   it('should handle case when no records are updated', async () => {
//     (UserModel.update as jest.Mock).mockResolvedValue([0]); // No rows updated

//     const result = await updateUser(mockEvent);

//     // The function should still return success even if no rows were updated
//     expect(result.statusCode).toBe(HttpStatus.OK);
//     const body = JSON.parse(result.body);
//     expect(body.message).toBe('User updated successfully');
//   });

//   it('should update only provided fields', async () => {
//     const partialUpdateEvent = {
//       ...mockEvent,
//       body: JSON.stringify({
//         id: 'user-123',
//         firstName: 'Partial',
//         lastName: 'Update',
//       }),
//     };

//     await updateUser(partialUpdateEvent);

//     expect(UserModel.update).toHaveBeenCalledWith(
//       {
//         first_name: 'Partial',
//         last_name: 'Update',
//         updated_at: expect.any(Date),
//         updated_by: 'user-456',
//       },
//       expect.any(Object)
//     );
//   });
// });

// describe('deleteUser function', () => {
//   const mockEvent = {
//     queryStringParameters: {
//       userId: 'user-123',
//     },
//     headers: {
//       'requester-practice-id': 'practice-123',
//       'requester-user-id': 'user-456',
//     },
//   } as unknown as APIGatewayProxyEventV2;

//   beforeEach(() => {
//     jest.clearAllMocks();

//     // Setup default mock implementations
//     (getRequestHeaders as jest.Mock).mockReturnValue({
//       requesterPracticeId: 'practice-123',
//       requesterUserId: 'user-456',
//     });
//     (authMiddleware as jest.Mock).mockResolvedValue(true);
//     (getUserRole as jest.Mock).mockResolvedValue('Admin');
//     (hasUserAccess as jest.Mock).mockReturnValue(true);
//     (UserModel.update as jest.Mock).mockResolvedValue([1]);
//     (PracticeUserModel.update as jest.Mock).mockResolvedValue([1]);
//   });

//   it('should successfully soft delete user', async () => {
//     const result = await deleteUser(mockEvent);

//     expect(result.statusCode).toBe(HttpStatus.OK);
//     const body = JSON.parse(result.body);
//     expect(body.status).toBe(EResponseStatus.SUCCESS);
//     expect(body.message).toBe('User deleted successfully');

//     // Verify UserModel.update was called correctly
//     expect(UserModel.update).toHaveBeenCalledWith(
//       {
//         active_status: false,
//         updated_by: 'user-456',
//         updated_at: expect.any(Date),
//       },
//       {
//         where: {
//           id: 'user-123',
//         },
//       }
//     );

//     // Verify PracticeUserModel.update was called correctly
//     expect(PracticeUserModel.update).toHaveBeenCalledWith(
//       {
//         active_status: false,
//         updated_by: 'user-456',
//         updated_at: expect.any(Date),
//       },
//       {
//         where: {
//           user_id: 'user-123',
//           practice_account_id: 'practice-123',
//         },
//       }
//     );
//   });

//   it('should throw error when user tries to delete their own account', async () => {
//     const selfDeleteEvent = {
//       ...mockEvent,
//       queryStringParameters: {
//         userId: 'user-456', // Same as requesterUserId
//       },
//     };

//     const result = await deleteUser(selfDeleteEvent);

//     expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
//     const body = JSON.parse(result.body);
//     expect(body.message).toBe('You cannot delete your own account');
//   });

//   // it('should throw error when user lacks permission', async () => {
//   //   (hasUserAccess as jest.Mock).mockReturnValue(false);

//   //   const result = await deleteUser(mockEvent);

//   //   expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
//   //   const body = JSON.parse(result.body);
//   //   expect(body.message).toBe('You do not have permission to delete user');
//   // });

//   // it('should throw error when requester account does not exist', async () => {
//   //   (getUserRole as jest.Mock).mockResolvedValue(null);

//   //   const result = await deleteUser(mockEvent);

//   //   expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
//   //   const body = JSON.parse(result.body);
//   //   expect(body.message).toBe('Account does not exist');
//   // });

//   // it('should handle missing userId parameter', async () => {
//   //   const invalidEvent = {
//   //     ...mockEvent,
//   //     queryStringParameters: {}, // Missing userId
//   //   };

//   //   const result = await deleteUser(invalidEvent);

//   //   expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
//   //   const body = JSON.parse(result.body);
//   //   expect(body.message).toContain('Validation error');
//   // });

//   // it('should handle database errors', async () => {
//   //   (UserModel.update as jest.Mock).mockRejectedValue(new Error('Database error'));

//   //   const result = await deleteUser(mockEvent);

//   //   expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
//   //   const body = JSON.parse(result.body);
//   //   expect(body.message).toBe('Database error');
//   // });

//   it('should handle case when no records are updated', async () => {
//     (UserModel.update as jest.Mock).mockResolvedValue([0]); // No rows updated

//     const result = await deleteUser(mockEvent);

//     // The function should still return success even if no rows were updated
//     expect(result.statusCode).toBe(HttpStatus.OK);
//     const body = JSON.parse(result.body);
//     expect(body.message).toBe('User deleted successfully');
//   });

//   it('should validate auth before checking permissions', async () => {
//     // Verify authMiddleware is called before permission checks
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const callOrder: any[] = [];
//     (authMiddleware as jest.Mock).mockImplementation(() => {
//       callOrder.push('authMiddleware');
//       return Promise.resolve(true);
//     });
//     (getUserRole as jest.Mock).mockImplementation(() => {
//       callOrder.push('getUserRole');
//       return Promise.resolve('Admin');
//     });

//     await deleteUser(mockEvent);

//     expect(callOrder).toEqual(['authMiddleware', 'getUserRole']);
//   });
// });
