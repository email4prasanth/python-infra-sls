import { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sequelize } from '../lib/connections';
import { HttpStatus } from '../lib/enum';
import { AppError } from '../lib/error';
import {
  verifyOtp as checkOtp,
  generateAuthToken,
  generateHash,
  generateOtp,
  generateRefreshToken,
} from '../lib/utils';
import { authMiddleware } from '../middleware';
import { LoginModel, PracticeAccountModel, UserModel } from '../models';
import { EResponseStatus } from '../types';
import {
  forgotPassword,
  login,
  loginCompletion,
  me,
  refreshToken,
  resendOtp,
  resetPassword,
  selectLoginPracticeAccount,
  setPassword,
  verifyOtp,
} from './auth.service';
import { checkLoginExists, sendEmailNotification } from './utils';

// Mock all dependencies
jest.mock('../lib/connections');
jest.mock('bcrypt');
jest.mock('../middleware/audit-log');

jest.mock('jsonwebtoken');

jest.mock('../lib/utils', () => ({
  generateOtp: jest.fn(),
  verifyOtp: jest.fn(),
  generateAuthToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  generateHash: jest.fn(),
}));

jest.mock('../middleware/auth.middleware', () => ({
  authMiddleware: jest.fn(),
}));

jest.mock('./utils', () => ({
  checkLoginExists: jest.fn(),
  sendEmailNotification: jest.fn(),
}));

jest.mock('../models/login.model', () => ({
  LoginModel: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../models/user.model', () => ({
  UserModel: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../models/practice-account.model', () => ({
  PracticeAccountModel: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe('login function', () => {
  const mockEvent = {
    body: JSON.stringify({
      emailId: 'test@example.com',
      password: 'password123',
    }),
  } as APIGatewayProxyEventV2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success response for valid credentials', async () => {
    // Mock UserModel.findAll
    const mockUser = {
      email_id: 'test@example.com',
      password: 'hashedPassword',
      active_status: true,
    };
    (UserModel.findAll as jest.Mock).mockResolvedValue([mockUser]);

    // Mock bcrypt.compare
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Mock sequelize.query
    (sequelize.query as jest.Mock).mockResolvedValue([{ id: 1, practice_name: 'Test Practice' }]);

    // Mock LoginModel.create
    const mockLogin = {
      id: 'login-id',
      email_id: 'test@example.com',
      is_credential_verified: true,
    };
    (LoginModel.create as jest.Mock).mockResolvedValue({
      get: () => mockLogin,
    });

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('Credentials verification successful');
    expect(body.loginId).toBe('login-id');
    expect(body.emailId).toBe('test@example.com');
    expect(body.practiceAccountList).toEqual([{ id: 1, practice_name: 'Test Practice' }]);

    // Verify mocks were called correctly
    expect(UserModel.findAll).toHaveBeenCalledWith({
      where: {
        email_id: 'test@example.com',
        active_status: true,
      },
      raw: true,
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
    expect(sequelize.query).toHaveBeenCalled();
    expect(LoginModel.create).toHaveBeenCalledWith({
      email_id: 'test@example.com',
      is_credential_verified: true,
    });
  });

  it('should throw error when user does not exist', async () => {
    (UserModel.findAll as jest.Mock).mockResolvedValue([]);

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Incorrect email or password. Please try again.');
  });

  it('should throw error when password is invalid', async () => {
    const mockUser = {
      email_id: 'test@example.com',
      password: 'hashedPassword',
      active_status: true,
    };
    (UserModel.findAll as jest.Mock).mockResolvedValue([mockUser]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Incorrect email or password. Please try again.');
  });

  it('should handle errors thrown during the process', async () => {
    const error = new Error('Database connection failed');
    (UserModel.findAll as jest.Mock).mockRejectedValue(error);

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Database connection failed');
  });

  it('should validate the request body', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
    } as APIGatewayProxyEventV2;

    const result = await login(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('{"emailId":["Email is required"],"password":["Password is required"]}');
  });

  it('should handle case when practice accounts query returns empty', async () => {
    const mockUser = {
      email_id: 'test@example.com',
      password: 'hashedPassword',
      active_status: true,
    };
    (UserModel.findAll as jest.Mock).mockResolvedValue([mockUser]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (sequelize.query as jest.Mock).mockResolvedValue([]);

    const mockLogin = {
      id: 'login-id',
      email_id: 'test@example.com',
      is_credential_verified: true,
    };
    (LoginModel.create as jest.Mock).mockResolvedValue({
      get: () => mockLogin,
    });

    const result = await login(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.practiceAccountList).toEqual([]);
  });
});

describe('selectLoginPracticeAccount function', () => {
  const mockEvent = {
    body: JSON.stringify({
      loginId: 'login-id-123',
      emailId: 'test@example.com',
      practiceAccountId: '1',
    }),
  } as APIGatewayProxyEventV2;

  const mockUserDetail = {
    id: 'user-id-123',
    first_name: 'John',
    last_name: 'Doe',
    email_id: 'test@example.com',
    role: 'admin',
    has_2fa: true,
  };

  const mockOtp = {
    otp: '123456',
    secret: 'otp-secret-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock checkLoginExists
    (checkLoginExists as jest.Mock).mockResolvedValue(true);

    // Mock sequelize.query
    (sequelize.query as jest.Mock).mockResolvedValue([mockUserDetail]);

    // Mock generateOtp
    (generateOtp as jest.Mock).mockReturnValue(mockOtp);

    // Mock LoginModel.update
    (LoginModel.update as jest.Mock).mockResolvedValue([1]);
  });

  it('should successfully select practice account with 2FA enabled', async () => {
    const result = await selectLoginPracticeAccount(mockEvent);
    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('Practice account selected successful');
    expect(body.loginId).toBe('login-id-123');
    expect(body.userId).toBe('user-id-123');
    expect(body.emailId).toBe('test@example.com');
    expect(body.has2fa).toBe(true);
    expect(body.otp).toBe('123456');

    // Verify mocks were called correctly
    expect(checkLoginExists).toHaveBeenCalledWith('login-id-123', 'test@example.com');
    expect(sequelize.query).toHaveBeenCalled();
    expect(sendEmailNotification).toHaveBeenCalledWith({
      userId: 'user-id-123',
      practiceId: '1',
      userName: 'John Doe',
      email: 'test@example.com',
      role: 'admin',
      template: 'OTP',
      hasOtp: true,
      otp: '123456',
    });
    expect(LoginModel.update).toHaveBeenCalledWith(
      {
        practice_account_id: '1',
        user_id: 'user-id-123',
        otp_secret: 'otp-secret-123',
        otp: '123456',
      },
      {
        where: {
          id: 'login-id-123',
          email_id: 'test@example.com',
        },
      }
    );
  });

  it('should successfully select practice account with 2FA disabled', async () => {
    // Mock user with 2FA disabled
    const userWithout2fa = {
      ...mockUserDetail,
      has_2fa: false,
    };
    (sequelize.query as jest.Mock).mockResolvedValue([userWithout2fa]);

    const result = await selectLoginPracticeAccount(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.has2fa).toBe(false);

    // Verify email not sent when 2FA is disabled
    expect(sendEmailNotification).not.toHaveBeenCalled();

    // Verify OTP fields are null in update
    expect(LoginModel.update).toHaveBeenCalledWith(
      {
        practice_account_id: '1',
        user_id: 'user-id-123',
        otp_secret: null,
        otp: null,
      },
      expect.any(Object)
    );
  });

  it('should throw error when login does not exist', async () => {
    (checkLoginExists as jest.Mock).mockRejectedValue(new AppError('Login not found', HttpStatus.BAD_REQUEST));

    const result = await selectLoginPracticeAccount(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Login not found');
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
    } as APIGatewayProxyEventV2;

    const result = await selectLoginPracticeAccount(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain(
      '{"loginId":["Login ID is required"],"emailId":["Email ID is required"],"practiceAccountId":["Practice Account ID is required"]}'
    );
  });

  it('should handle database errors', async () => {
    (sequelize.query as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await selectLoginPracticeAccount(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Database error');
  });
});

describe('verifyOtp function', () => {
  const mockEvent = {
    body: JSON.stringify({
      loginId: 'login-id-123',
      emailId: 'test@example.com',
      otp: '123456',
    }),
  } as APIGatewayProxyEventV2;

  const mockLoginDetails = {
    id: 'login-id-123',
    email_id: 'test@example.com',
    otp_secret: 'otp-secret-123',
    is_2fa_verified: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock checkLoginExists
    (checkLoginExists as jest.Mock).mockResolvedValue(mockLoginDetails);

    // Mock checkOtp
    (checkOtp as jest.Mock).mockReturnValue(true);

    // Mock LoginModel.update
    (LoginModel.update as jest.Mock).mockResolvedValue([1]);
  });

  it('should successfully verify valid OTP', async () => {
    const result = await verifyOtp(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('OTP verification successful');

    // Verify mocks were called correctly
    expect(checkLoginExists).toHaveBeenCalledWith('login-id-123', 'test@example.com');
    expect(checkOtp).toHaveBeenCalledWith('123456', 'otp-secret-123');
    expect(LoginModel.update).toHaveBeenCalledWith(
      {
        is_2fa_verified: true,
      },
      {
        where: {
          id: 'login-id-123',
          email_id: 'test@example.com',
        },
      }
    );
  });

  it('should throw error for invalid OTP', async () => {
    (checkOtp as jest.Mock).mockReturnValue(false);

    const result = await verifyOtp(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Invalid Code');
  });

  it('should throw error when login does not exist', async () => {
    (checkLoginExists as jest.Mock).mockRejectedValue(new AppError('Login not found', HttpStatus.BAD_REQUEST));

    const result = await verifyOtp(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Login not found');
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
    } as APIGatewayProxyEventV2;

    const result = await verifyOtp(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain(
      '{"loginId":["Login ID is required"],"emailId":["Email ID is required"],"otp":["OTP is required"]}'
    );
  });

  it('should handle database update errors', async () => {
    (LoginModel.update as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await verifyOtp(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Database error');
  });

  it('should handle case when login is already verified', async () => {
    (checkLoginExists as jest.Mock).mockResolvedValue({
      ...mockLoginDetails,
      is_2fa_verified: true,
    });

    const result = await verifyOtp(mockEvent);

    // The function should still work even if already verified
    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
  });
});

describe('loginCompletion function', () => {
  const mockEvent = {
    body: JSON.stringify({
      loginId: 'login-id-123',
      userId: 'user-id-123',
      emailId: 'test@example.com',
      practiceAccountId: '1',
    }),
  } as APIGatewayProxyEventV2;

  const mockPracticeAccount = {
    id: '1',
    account_verified: true,
    active_status: true,
  };

  const mockUserDetail = {
    id: 'user-id-123',
    readable_id: 'user-123',
    practice_account_id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email_id: 'test@example.com',
    phone_number: '1234567890',
    role_id: '1',
    role: 'admin',
    dea: 'DEA123',
    license_number: 'LIC123',
    state_id: '1',
    state_of_issue: 'CA',
    has_2fa: true,
    account_verified: 'verified',
    active_status: true,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    updated_by: 'system',
  };

  const mockAuthToken = 'mock-auth-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockTokenDetails = { exp: 1234567890 };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock checkLoginExists
    (checkLoginExists as jest.Mock).mockResolvedValue(true);

    // Mock PracticeAccountModel.findOne
    (PracticeAccountModel.findOne as jest.Mock).mockResolvedValue({
      id: '1',
      account_verified: true,
      active_status: true,
    });

    // Mock sequelize.query
    (sequelize.query as jest.Mock).mockResolvedValue([mockUserDetail]);

    // Mock token generation
    (generateAuthToken as jest.Mock).mockReturnValue(mockAuthToken);
    (generateRefreshToken as jest.Mock).mockReturnValue(mockRefreshToken);
    (jwt.decode as jest.Mock).mockReturnValue(mockTokenDetails);

    // Mock LoginModel.update
    (LoginModel.update as jest.Mock).mockResolvedValue([1]);
  });

  it('should successfully complete login for verified accounts', async () => {
    const result = await loginCompletion(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    // Verify mocks were called correctly
    expect(checkLoginExists).toHaveBeenCalledWith('login-id-123', 'test@example.com');
    expect(PracticeAccountModel.findOne).toHaveBeenCalled();
    expect(sequelize.query).toHaveBeenCalled();
    expect(LoginModel.update).toHaveBeenCalled();
  });

  it('should handle inactive practice account', async () => {
    (PracticeAccountModel.findOne as jest.Mock).mockResolvedValue(null);

    const result = await loginCompletion(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.FAILURE);
    expect(body.message).toBe('Practice account is not active');
  });

  it('should handle unverified practice account', async () => {
    (PracticeAccountModel.findOne as jest.Mock).mockResolvedValue({
      ...mockPracticeAccount,
      account_verified: false,
    });

    const result = await loginCompletion(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.FAILURE);
    expect(body.message).toBe('Your practice account is not verified');
  });

  it('should handle unverified user account', async () => {
    (sequelize.query as jest.Mock).mockResolvedValue([
      {
        ...mockUserDetail,
        account_verified: 'pending',
      },
    ]);

    const result = await loginCompletion(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.FAILURE);
    expect(body.message).toBe('Your user account is not verified');
  });

  it('should throw error when login does not exist', async () => {
    (checkLoginExists as jest.Mock).mockRejectedValue(new AppError('Login not found', HttpStatus.BAD_REQUEST));

    const result = await loginCompletion(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Login not found');
  });
});

describe('resendOtp function', () => {
  const mockEvent = {
    body: JSON.stringify({
      loginId: 'login-id-123',
      emailId: 'test@example.com',
    }),
  } as APIGatewayProxyEventV2;

  const mockOtp = {
    otp: '123456',
    secret: 'otp-secret-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (checkLoginExists as jest.Mock).mockResolvedValue(true);
    (generateOtp as jest.Mock).mockReturnValue(mockOtp);
    (sendEmailNotification as jest.Mock).mockResolvedValue(true);
    (LoginModel.update as jest.Mock).mockResolvedValue([1]);
  });

  it('should successfully resend OTP', async () => {
    const result = await resendOtp(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('OTP resent successfully');
    expect(body.otp).toBe('123456');

    // Verify mocks were called correctly
    expect(checkLoginExists).toHaveBeenCalledWith('login-id-123', 'test@example.com');
    expect(generateOtp).toHaveBeenCalled();
    expect(sendEmailNotification).toHaveBeenCalledWith({
      userId: '',
      practiceId: '',
      userName: '',
      email: 'test@example.com',
      role: '',
      template: 'OTP',
      hasOtp: true,
      otp: '123456',
    });
    expect(LoginModel.update).toHaveBeenCalledWith(
      {
        otp_secret: 'otp-secret-123',
        otp: '123456',
      },
      {
        where: {
          id: 'login-id-123',
          email_id: 'test@example.com',
        },
      }
    );
  });

  it('should throw error when login does not exist', async () => {
    (checkLoginExists as jest.Mock).mockRejectedValue(new AppError('Login not found', HttpStatus.BAD_REQUEST));

    const result = await resendOtp(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Login not found');
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
    } as APIGatewayProxyEventV2;

    const result = await resendOtp(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('{"loginId":["Login ID is required"],"emailId":["Email ID is required"]}');
  });

  it('should handle database update errors', async () => {
    (LoginModel.update as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await resendOtp(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Database error');
  });

  it('should generate new OTP and secret for each resend', async () => {
    const firstOtp = { otp: '111111', secret: 'secret-111' };
    const secondOtp = { otp: '222222', secret: 'secret-222' };

    (generateOtp as jest.Mock).mockReturnValueOnce(firstOtp).mockReturnValueOnce(secondOtp);

    // First call
    await resendOtp(mockEvent);
    expect(LoginModel.update).toHaveBeenCalledWith(
      {
        otp_secret: 'secret-111',
        otp: '111111',
      },
      expect.any(Object)
    );

    // Second call
    await resendOtp(mockEvent);
    expect(LoginModel.update).toHaveBeenCalledWith(
      {
        otp_secret: 'secret-222',
        otp: '222222',
      },
      expect.any(Object)
    );
  });
});

describe('refreshToken function', () => {
  const mockEvent = {
    body: JSON.stringify({
      emailId: 'test@example.com',
      loginId: 'login-id-123',
      userId: 'user-id-123',
      refreshToken: 'valid-refresh-token',
    }),
  } as APIGatewayProxyEventV2;

  const mockLoginDetails = {
    id: 'login-id-123',
    user_id: 'user-id-123',
    refresh_token: 'valid-refresh-token',
  };

  const mockUserDetails = {
    id: 'user-id-123',
    email_id: 'test@example.com',
    role: 'admin',
  };

  const mockAuthToken = 'new-auth-token';
  const mockTokenDetails = { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1 hour from now

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockImplementation(() => 1630000000000); // Mock current time

    // Setup mock implementations
    (checkLoginExists as jest.Mock).mockResolvedValue(true);
    (sequelize.query as jest.Mock)
      .mockImplementationOnce(() => [mockLoginDetails]) // First query for login details
      .mockImplementationOnce(() => [mockUserDetails]); // Second query for user details
    (jwt.decode as jest.Mock)
      .mockImplementationOnce(() => ({ exp: mockTokenDetails.exp + 3600 })) // Refresh token decode
      .mockImplementationOnce(() => mockTokenDetails); // Auth token decode
    (generateAuthToken as jest.Mock).mockReturnValue(mockAuthToken);
    (LoginModel.update as jest.Mock).mockResolvedValue([1]);
  });

  it('should successfully refresh token with valid refresh token', async () => {
    const result = await refreshToken(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('Auth token refreshed successfully');
    // expect(body.authToken).toBe(mockAuthToken);
    expect(body.exp).toBe(mockTokenDetails.exp);

    // Verify mocks were called correctly
    expect(checkLoginExists).toHaveBeenCalledWith('login-id-123', 'user-id-123');
    expect(sequelize.query).toHaveBeenCalled();
    expect(jwt.decode).toHaveBeenCalled();
    expect(LoginModel.update).toHaveBeenCalled();
  });

  it('should throw error when login does not exist', async () => {
    (checkLoginExists as jest.Mock).mockRejectedValue(new AppError('Login not found', HttpStatus.BAD_REQUEST));

    const result = await refreshToken(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Login not found');
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
    } as APIGatewayProxyEventV2;

    const result = await refreshToken(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('{"loginId":["Login ID is required"],"emailId":["Email ID is required"]}');
  });
});

describe('me function', () => {
  const mockEvent = {
    body: JSON.stringify({
      userId: 'user-id-123',
      practiceAccountId: 'practice-id-123',
    }),
    headers: {
      authorization: 'Bearer valid-token',
    },
  } as unknown as APIGatewayProxyEventV2;

  const mockUserDetails = {
    id: 'user-id-123',
    practice_account_id: 'practice-id-123',
    first_name: 'John',
    last_name: 'Doe',
    email_id: 'john.doe@example.com',
    phone_number: '1234567890',
    role_id: '1',
    role: 'admin',
    dea: 'DEA123',
    license_number: 'LIC123',
    state_id: '1',
    state_of_issue: 'CA',
    has_2fa: true,
    account_verified: 'verified',
    active_status: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (authMiddleware as jest.Mock).mockResolvedValue(true);
    (sequelize.query as jest.Mock).mockResolvedValue([mockUserDetails]);
  });

  it('should successfully fetch user details', async () => {
    const result = await me(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('User details fetched successfully');

    // Verify mocks were called correctly
    expect(authMiddleware).toHaveBeenCalledWith(mockEvent);
    expect(sequelize.query).toHaveBeenCalled();
  });

  it('should throw error when user does not exist', async () => {
    (sequelize.query as jest.Mock).mockResolvedValue([]);

    try {
      await me(mockEvent);
    } catch (err) {
      expect(err).toBe(HttpStatus.UNAUTHORIZED);
    }
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as unknown as APIGatewayProxyEventV2;

    const result = await me(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain(
      '{"practiceAccountId":["Practice ID is required"],"userId":["User ID is required"]}'
    );
  });

  it('should handle authentication failures', async () => {
    (authMiddleware as jest.Mock).mockRejectedValue(new AppError('Unauthorized', HttpStatus.UNAUTHORIZED));

    const result = await me(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Unauthorized');
  });

  it('should handle case when user is inactive', async () => {
    (sequelize.query as jest.Mock).mockResolvedValue([
      {
        ...mockUserDetails,
        active_status: false,
      },
    ]);

    try {
      await me(mockEvent);
    } catch (err) {
      expect(err).toBe(HttpStatus.UNAUTHORIZED);
    }
  });
});

describe('setPassword function', () => {
  const mockEvent = {
    body: JSON.stringify({
      credential: 'valid-jwt-token',
      password: 'newPassword123!',
    }),
  } as APIGatewayProxyEventV2;

  const mockDecodedJwt = {
    sub: 'user-id-123',
    email: 'test@example.com',
  };

  const mockUserDetail = {
    id: 'user-id-123',
    email_id: 'test@example.com',
    is_password_active: false,
    active_status: true,
  };

  const mockHashedPassword = 'hashedPassword123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (jwt.verify as jest.Mock).mockReturnValue(mockDecodedJwt);
    (UserModel.findOne as jest.Mock).mockResolvedValue(mockUserDetail);
    (generateHash as jest.Mock).mockResolvedValue(mockHashedPassword);
    (UserModel.update as jest.Mock).mockResolvedValue([1]);
  });

  it('should successfully set password for new user', async () => {
    const result = await setPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('Password set successfully');

    // Verify mocks were called correctly
    expect(jwt.verify).toHaveBeenCalled();
    expect(UserModel.findOne).toHaveBeenCalled();
    expect(generateHash).toHaveBeenCalled();
    expect(UserModel.update).toHaveBeenCalled();
  });

  it('should throw error when user does not exist', async () => {
    (UserModel.findOne as jest.Mock).mockResolvedValue(null);

    const result = await setPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('User does not exist');
  });

  it('should throw error when password is already set', async () => {
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      ...mockUserDetail,
      is_password_active: true,
    });

    const result = await setPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Your account is activated and password is already set.');
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
    } as APIGatewayProxyEventV2;

    const result = await setPassword(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('{"credential":["Credential is missing"]}');
  });

  it('should handle JWT verification errors', async () => {
    const jwtErrors = ['jwt expired', 'jwt must be provided', 'invalid signature', 'jwt malformed'];

    for (const error of jwtErrors) {
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error(error);
      });

      const result = await setPassword(mockEvent);
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Access denied');
    }
  });

  it('should handle case when user is inactive', async () => {
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      ...mockUserDetail,
      active_status: false,
    });

    try {
      await setPassword(mockEvent);
    } catch (err) {
      expect(err).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});

describe('forgotPassword function', () => {
  const mockEvent = {
    queryStringParameters: {
      emailId: 'test@example.com',
    },
  } as unknown as APIGatewayProxyEventV2;

  const mockUser = {
    id: 'user-id-123',
    email_id: 'test@example.com',
    active_status: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (UserModel.findAll as jest.Mock).mockResolvedValue([mockUser]);
    (sendEmailNotification as jest.Mock).mockResolvedValue(true);
  });

  it('should successfully send password reset email', async () => {
    const result = await forgotPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('Password reset link sent successfully');

    // Verify mocks were called correctly
    expect(UserModel.findAll).toHaveBeenCalledWith({
      where: {
        email_id: 'test@example.com',
        active_status: true,
      },
    });
    expect(sendEmailNotification).toHaveBeenCalledWith({
      userId: '',
      practiceId: '',
      userName: '',
      email: 'test@example.com',
      role: '',
      template: 'RESET_PASSWORD',
    });
  });

  it('should throw error when user does not exist', async () => {
    (UserModel.findAll as jest.Mock).mockResolvedValue([]);

    try {
      await forgotPassword(mockEvent);
    } catch (err) {
      expect(err).toBe(HttpStatus.BAD_REQUEST);
      expect(err).toContain('No user found for test@example.com. The account may not exist or has been deleted.');
    }
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      queryStringParameters: {
        // Missing required emailId
      },
    } as APIGatewayProxyEventV2;

    const result = await forgotPassword(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('{"emailId":["Email ID is required"]}');
  });

  it('should handle case when user is inactive', async () => {
    (UserModel.findAll as jest.Mock).mockResolvedValue([
      {
        ...mockUser,
        active_status: false,
      },
    ]);

    try {
      await forgotPassword(mockEvent);
    } catch (err) {
      expect(err).toContain(HttpStatus.BAD_REQUEST);
      expect(err).toContain('No user found for test@example.com');
    }
  });
});

describe('resetPassword function', () => {
  const mockEvent = {
    body: JSON.stringify({
      credential: 'valid-jwt-token',
      password: 'newPassword123!',
    }),
  } as APIGatewayProxyEventV2;

  const mockDecodedJwt = {
    email: 'test@example.com',
  };

  const mockUserDetails = [
    {
      id: 'user-id-123',
      email_id: 'test@example.com',
      password: 'oldHashedPassword',
      active_status: true,
    },
  ];

  const mockHashedPassword = 'newHashedPassword123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (jwt.verify as jest.Mock).mockReturnValue(mockDecodedJwt);
    (UserModel.findAll as jest.Mock).mockResolvedValue(mockUserDetails);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    (generateHash as jest.Mock).mockResolvedValue(mockHashedPassword);
    (UserModel.update as jest.Mock).mockResolvedValue([1]);
  });

  it('should successfully reset password', async () => {
    const result = await resetPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.OK);
    const body = JSON.parse(result.body);
    expect(body.status).toBe(EResponseStatus.SUCCESS);
    expect(body.message).toBe('Password reset successfully');

    // Verify mocks were called correctly
    expect(jwt.verify).toHaveBeenCalled();
    expect(UserModel.findAll).toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalled();
    expect(generateHash).toHaveBeenCalled();
    expect(UserModel.update).toHaveBeenCalled();
  });

  it('should throw error when user does not exist', async () => {
    (UserModel.findAll as jest.Mock).mockResolvedValue([]);

    const result = await resetPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('No user found for test@example.com. The account may not exist or has been deleted.');
  });

  it('should throw error when using same password', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await resetPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Enter new password.');
  });

  it('should handle validation errors', async () => {
    const invalidEvent = {
      body: JSON.stringify({
        // Missing required fields
      }),
    } as APIGatewayProxyEventV2;

    const result = await resetPassword(invalidEvent);

    expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const body = JSON.parse(result.body);
    expect(body.message).toContain('{"credential":["Credential is missing"]}');
  });

  it('should handle password hashing errors', async () => {
    (generateHash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

    const result = await resetPassword(mockEvent);

    expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Hashing failed');
  });

  it('should update all user accounts with same email', async () => {
    const multipleUsers = [
      { id: 'user-id-1', email_id: 'test@example.com', password: 'oldHash1', active_status: true },
      { id: 'user-id-2', email_id: 'test@example.com', password: 'oldHash2', active_status: true },
    ];
    (UserModel.findAll as jest.Mock).mockResolvedValue(multipleUsers);

    await resetPassword(mockEvent);

    expect(UserModel.update).toHaveBeenCalledTimes(2);
    expect(UserModel.update).toHaveBeenCalledWith(expect.any(Object), {
      where: {
        id: 'user-id-1',
        email_id: 'test@example.com',
      },
    });
    expect(UserModel.update).toHaveBeenCalledWith(expect.any(Object), {
      where: {
        id: 'user-id-2',
        email_id: 'test@example.com',
      },
    });
  });
});
