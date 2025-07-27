import { APIGatewayProxyEventV2 } from 'aws-lambda';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../lib/connections';
import { HttpStatus } from '../lib/enum';
import { AppError } from '../lib/error';
import { verifyOtp as checkOtp, generateHash, generateOtp, generateRefreshToken } from '../lib/utils';
import { EMAIL_TEMPLATE } from '../lib/utils/email-builder';
import { generateAuthToken } from '../lib/utils/generate-auth-token';
import { authMiddleware, errorHandler, validate } from '../middleware';
import { AuditLogV2 } from '../middleware/audit-log';
import { LoginModel, PracticeAccountModel, UserModel } from '../models';
import {
  loginCompletionSchema,
  loginSchema,
  meSchema,
  resendOtpSchema,
  resetPasswordSchema,
  selectLoginPracticeAccountSchema,
  setPasswordSchema,
  triggerResetPasswordSchema,
  verifyOtpSchema,
} from '../schemas';
import {
  EResponseStatus,
  ILogin,
  ILoginCompletionRequest,
  ILoginRequest,
  IMeRequest,
  IOtpRequest,
  IPasswordCredential,
  IPracticeAccount,
  IRefreshTokenRequest,
  IResendOtpRequest,
  IResetPasswordRequest,
  ISelectLoginPracticeAccountRequest,
  ISetPasswordRequest,
  ITriggerResetPasswordRequest,
  IUser,
  IUserAccount,
} from '../types';
import { checkLoginExists, sendEmailNotification } from './utils';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const login = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as ILoginRequest;
    validate(loginSchema, reqBody);
    const { emailId, password } = reqBody;

    // Check if user exists
    // Check if user exists with email-id
    const userDetails = (await UserModel.findAll({
      where: {
        email_id: emailId,
        active_status: true,
      },
      raw: true,
    })) as unknown as IUserAccount[];

    // no user exists
    if (!(userDetails.length > 0)) {
      throw new AppError('Incorrect email or password. Please try again.', HttpStatus.BAD_REQUEST);
    }

    const _userDetails = userDetails[0];

    // NOTE:
    // users having same email-id accross all practice accounts hold unique password
    // hence checking password validity from the first object userDetails[0];
    const isPasswordValid = await bcrypt.compare(password, _userDetails?.password as string);
    if (!isPasswordValid) {
      throw new AppError('Incorrect email or password. Please try again.', HttpStatus.BAD_REQUEST);
    }

    const userExistanceInPracticesQuery = `
    SELECT 
      pa.id, 
      pa.practice_name
    FROM 
      user_account AS ua, 
      practice_user AS pu, 
      practice_account AS pa
    WHERE
      ua.id = pu.user_id
      AND
      pu.practice_account_id = pa.id
      AND
      ua.email_id = :emailId
      AND
      ua.active_status = true
    `;

    const usersExistingPracticeAccounts = await sequelize.query(userExistanceInPracticesQuery, {
      replacements: {
        emailId: emailId,
      },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const loginDetail = (
      await LoginModel.create({
        email_id: _userDetails?.email_id,
        is_credential_verified: true,
      })
    ).get({ plain: true }) as ILogin;

    const response = {
      message: 'Credentials verification successful',
      status: EResponseStatus.SUCCESS,
      loginId: loginDetail?.id,
      emailId: _userDetails?.email_id,
      practiceAccountList: usersExistingPracticeAccounts,
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });

    return response;
  }
};

export const selectLoginPracticeAccount = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as ISelectLoginPracticeAccountRequest;
    validate(selectLoginPracticeAccountSchema, reqBody);
    const { loginId, emailId, practiceAccountId } = reqBody;

    // Check if login exists
    await checkLoginExists(loginId, emailId);

    // get user detail who belongs to {{practiceAccountId}} with {{emailId}}
    const userDetailQuery = `
    SELECT 
      ua.id,
      ua.first_name,
      ua.last_name,
      ua.email_id,
      pu.role,
      pu.has_2fa
    FROM
      user_account AS ua,
      practice_user AS pu
    WHERE
      ua.id = pu.user_id
      AND
      ua.email_id = :emailId
      AND
      pu.practice_account_id = :practiceAccountId
    `;

    const userDetail = (await sequelize.query(userDetailQuery, {
      replacements: {
        emailId: emailId,
        practiceAccountId: practiceAccountId,
      },
      type: QueryTypes.SELECT,
      raw: true,
    })) as unknown as Pick<IUser, 'id' | 'has_2fa' | 'email_id' | 'first_name' | 'last_name' | 'role'>[];

    const _userDetail = userDetail[0];

    const _generateOtp = generateOtp();

    if (_userDetail?.has_2fa) {
      sendEmailNotification({
        userId: _userDetail.id,
        practiceId: practiceAccountId,
        userName: `${_userDetail.first_name} ${_userDetail.last_name}`,
        email: emailId,
        role: _userDetail.role,
        template: EMAIL_TEMPLATE.OTP, // send otp email
        hasOtp: true,
        otp: _generateOtp.otp,
      });
    }

    await LoginModel.update(
      {
        practice_account_id: practiceAccountId,
        user_id: _userDetail?.id,
        otp_secret: _userDetail?.has_2fa ? _generateOtp.secret : null,
        otp: _userDetail?.has_2fa ? _generateOtp.otp : null,
      },
      {
        where: {
          id: loginId,
          email_id: emailId,
        },
      }
    );

    const response = {
      message: 'Practice account selected successful',
      status: EResponseStatus.SUCCESS,
      loginId: loginId,
      userId: _userDetail?.id,
      emailId: _userDetail?.email_id,
      has2fa: _userDetail?.has_2fa,
      otp: _generateOtp.otp, // TODO: Remove this once 2FA is implemented via AWS SES
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};

export const verifyOtp = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as IOtpRequest;
    validate(verifyOtpSchema, reqBody);
    const { loginId, emailId, otp } = reqBody;
    // Check if login exists
    const _loginDetails = await checkLoginExists(loginId, emailId);
    const isOtpValid = checkOtp(otp, _loginDetails?.otp_secret as string);

    if (!isOtpValid) {
      throw new AppError('Invalid Code', HttpStatus.BAD_REQUEST);
    }

    await LoginModel.update(
      {
        is_2fa_verified: true,
      },
      {
        where: {
          id: loginId,
          email_id: emailId,
        },
      }
    );

    const response = {
      message: 'OTP verification successful',
      status: EResponseStatus.SUCCESS,
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });

    return response;
  }
};

export const loginCompletion = async (req: APIGatewayProxyEventV2) => {
  let response;
  let authToken = '';
  let refreshToken = '';
  let authDetails = {} as { exp: number };
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as ILoginCompletionRequest;
    validate(loginCompletionSchema, reqBody);

    const { loginId, userId, emailId, practiceAccountId } = reqBody;

    // Check if login exists
    await checkLoginExists(loginId, emailId);

    const practiceAccountDetail = (await PracticeAccountModel.findOne({
      where: {
        id: practiceAccountId,
        active_status: true,
      },
      raw: true,
    })) as unknown as IPracticeAccount;

    const userDetailQuery = `
    SELECT 
      ua.id,
      pu.readable_id,
      pu.practice_account_id,
      ua.first_name,
      ua.last_name,
      ua.email_id,
      ua.phone_number,
      pu.role_id,
      pu.role,
      pu.dea,
      pu.license_number,
      pu.state_id,
      pu.state_of_issue,
      pu.has_2fa,
      pu.account_verified,
      pu.active_status,
      pu.created_at,
      pu.updated_at,
      pu.created_by,
      pu.updated_by
    FROM
      user_account AS ua,
      practice_user AS pu
    WHERE
      ua.id = pu.user_id
      AND
      ua.email_id = :emailId
      AND
      pu.practice_account_id = :practiceAccountId
      AND
      pu.active_status = true
    `;

    const userDetail = (await sequelize.query(userDetailQuery, {
      replacements: {
        emailId: emailId,
        practiceAccountId: practiceAccountId,
      },
      type: QueryTypes.SELECT,
      raw: true,
    })) as unknown as Omit<IUser, 'password' | 'doctor_email_id'>[];

    const _userDetail = userDetail[0];

    // Check if practice account is active & verified
    if (!practiceAccountDetail || !practiceAccountDetail?.account_verified) {
      response = {
        message: !practiceAccountDetail
          ? 'Practice account is not active'
          : !practiceAccountDetail?.account_verified
            ? 'Your practice account is not verified'
            : '',
        status: EResponseStatus.FAILURE,
      };
    }

    // Check if user is active & verified
    if (!_userDetail) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    if (_userDetail?.account_verified !== 'verified') {
      response = {
        message: 'Your user account is not verified',
        status: EResponseStatus.FAILURE, // throw unauthorised for inactive user
      };
    }

    // generate auth token and refresh token only for verified practice accounts and verified users
    if (practiceAccountDetail?.account_verified && _userDetail?.account_verified === 'verified') {
      authToken = generateAuthToken({
        userId: userId,
        loginId: loginId,
        email: _userDetail?.email_id,
        role: _userDetail?.role,
      });
      authDetails = jwt.decode(authToken) as { exp: number };
      refreshToken = generateRefreshToken({
        userId: userId,
        loginId: loginId,
        email: _userDetail?.email_id,
        role: _userDetail?.role,
      });
      response = {
        message: 'Login successful',
        authToken: authToken,
        refreshToken: refreshToken,
        exp: authDetails.exp,
        userDetails: _userDetail,
        status: EResponseStatus.SUCCESS,
      };
    }

    const remark = !practiceAccountDetail
      ? 'Practice account is not active'
      : !practiceAccountDetail?.account_verified
        ? 'Practice account not verified'
        : !userDetail
          ? 'Your user account is not active'
          : _userDetail?.account_verified !== 'verified'
            ? 'User account not verified'
            : 'Login successful';

    await LoginModel.update(
      {
        auth_token: authToken,
        refresh_token: refreshToken,
        remark,
        login_time: new Date(),
      },
      {
        where: {
          id: loginId,
          email_id: emailId,
        },
      }
    );

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};

export const resendOtp = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as IResendOtpRequest;
    validate(resendOtpSchema, reqBody);
    const { loginId, emailId } = reqBody;

    // Check if login exists
    await checkLoginExists(loginId, emailId);

    const _generateOtp = generateOtp();

    sendEmailNotification({
      userId: '',
      practiceId: '',
      userName: '',
      email: emailId,
      role: '',
      template: EMAIL_TEMPLATE.OTP, // send otp email
      hasOtp: true,
      otp: _generateOtp.otp,
    });

    await LoginModel.update(
      {
        otp_secret: _generateOtp.secret,
        otp: _generateOtp.otp,
      },
      {
        where: {
          id: loginId,
          email_id: emailId,
        },
      }
    );

    const response = {
      message: 'OTP resent successfully',
      status: EResponseStatus.SUCCESS,
      otp: _generateOtp.otp, // TODO: Remove this once 2FA is implemented via AWS SES
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};

export const refreshToken = async (req: APIGatewayProxyEventV2) => {
  let response;
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as IRefreshTokenRequest;
    validate(resendOtpSchema, reqBody);
    const { loginId, userId, refreshToken } = reqBody;

    // Check if login exists
    await checkLoginExists(loginId, userId);

    const getLoginDetailsQuery = `
    SELECT *
    FROM login
    WHERE
      id = '${loginId}'
      AND
      user_id = '${userId}'`;

    const loginDetails = (await sequelize.query(getLoginDetailsQuery, {
      type: QueryTypes.SELECT,
      raw: true,
    })) as ILogin[];

    const _loginDetails = loginDetails[0];

    // check if refresh token is matching with the one in the database
    if (_loginDetails?.refresh_token !== refreshToken) {
      response = {
        message: 'Invalid refresh token',
        status: EResponseStatus.FAILURE,
        statusCode: HttpStatus.UNAUTHORIZED,
      };
    }

    // check if refresh token is expired

    const decodedToken = jwt.decode(refreshToken) as { exp: number };
    const currentTime = Math.floor(Date.now() / 1000); // in seconds

    // check if refresh token is expired
    if (decodedToken.exp < currentTime) {
      response = {
        message: 'Refresh token expired',
        status: EResponseStatus.FAILURE,
        statusCode: HttpStatus.UNAUTHORIZED,
      };
    } else {
      const getUserQuery = `
      SELECT *
      FROM user_account as ua, practice_user as pu
      WHERE
      ua.id = pu.user_id
      AND
      id = '${userId}'`;

      const userDetails = (await sequelize.query(getUserQuery, {
        type: QueryTypes.SELECT,
        raw: true,
      })) as IUser[];

      const _userDetails = userDetails[0];

      // refresh token is valid generate new auth token
      const authToken = generateAuthToken({
        userId: userId,
        loginId: loginId,
        email: _userDetails?.email_id,
        role: _userDetails?.role,
      });
      await LoginModel.update(
        {
          auth_token: authToken,
          login_time: new Date(),
        },
        {
          where: {
            id: loginId,
            user_id: userId,
          },
        }
      );

      response = {
        message: 'Auth token refreshed successfully',
        status: EResponseStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        authToken,
        exp: (jwt.decode(authToken) as { exp: number }).exp,
      };
    }

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: response?.statusCode,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};

export const me = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as IMeRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(meSchema, reqBody);
    const { userId, practiceAccountId } = reqBody;

    const getUserQuery = `
    SELECT 
      ua.id, 
      pu.practice_account_id,
      ua.first_name,
      ua.last_name,
      ua.email_id,
      ua.phone_number,
      pu.role_id,
      pu.role,
      pu.dea,
      pu.license_number,
      pu.state_id,
      pu.state_of_issue,
      pu.has_2fa,
      pu.account_verified,
      pu.active_status
    FROM user_account AS ua, practice_user AS pu
    WHERE
      ua.id = pu.user_id
      AND
      pu.user_id = '${userId}'
      AND
      pu.practice_account_id = '${practiceAccountId}'
      AND
      pu.active_status = true`;

    const userDetails = (await sequelize.query(getUserQuery, {
      type: QueryTypes.SELECT,
      raw: true,
    })) as IUser[];
    const _userDetail = userDetails[0];

    if (!_userDetail) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }

    const response = {
      message: 'User details fetched successfully',
      status: EResponseStatus.SUCCESS,
      userDetails: _userDetail,
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};

export const setPassword = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as ISetPasswordRequest;
    validate(setPasswordSchema, reqBody);
    const { credential, password } = reqBody;
    const decodedJwt = jwt.verify(credential, JWT_SECRET) as IPasswordCredential;
    const { sub: userId, email } = decodedJwt;

    const userDetail = (await UserModel.findOne({
      where: {
        id: userId,
        email_id: email,
      },
    })) as unknown as IUserAccount;

    // check if user exist
    if (!userDetail) {
      throw new AppError('User does not exist', HttpStatus.BAD_REQUEST);
    }
    // Check if the user already activated password
    if (userDetail.is_password_active) {
      throw new AppError('Your account is activated and password is already set.', HttpStatus.BAD_REQUEST);
    }

    const _password = await generateHash(password ?? '');

    await UserModel.update(
      {
        password: _password,
        is_password_active: true,
      },
      {
        where: {
          // id: userId,
          email_id: email,
          active_status: true,
        },
      }
    );

    const response = {
      message: 'Password set successfully',
      status: EResponseStatus.SUCCESS,
    };
    await AuditLogV2({
      request: req,
      response: response ?? {},
    });
    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);

    const mapJwtError = ['jwt expired', 'jwt must be provided', 'invalid signature', 'jwt malformed'];
    if (mapJwtError.includes(error.message)) {
      error.message = 'Access denied';
      error.statusCode = HttpStatus.BAD_REQUEST;
    }
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};

export const forgotPassword = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqParam = req?.queryStringParameters as unknown as ITriggerResetPasswordRequest;
    validate(triggerResetPasswordSchema, reqParam);
    const { emailId } = reqParam;

    const isUserExistWithEmail = (await UserModel.findAll({
      where: {
        email_id: emailId,
        active_status: true,
      },
    })) as unknown as IUserAccount[];

    if (!isUserExistWithEmail.length) {
      throw new AppError(
        `No user found for ${emailId}. The account may not exist or has been deleted.`,
        HttpStatus.BAD_REQUEST
      );
    }

    await sendEmailNotification({
      userId: '',
      practiceId: '',
      userName: '',
      email: emailId,
      role: '',
      template: EMAIL_TEMPLATE.RESET_PASSWORD, // send reset email
    });

    const response = {
      message: 'Password reset link sent successfully',
      status: EResponseStatus.SUCCESS,
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);

    const mapJwtError = ['jwt expired', 'jwt must be provided', 'invalid signature', 'jwt malformed'];
    if (mapJwtError.includes(error.message)) {
      error.message = 'Access denied';
      error.statusCode = HttpStatus.BAD_REQUEST;
    }
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};

export const resetPassword = async (req: APIGatewayProxyEventV2) => {
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as IResetPasswordRequest;
    validate(resetPasswordSchema, reqBody);
    const { credential, password } = reqBody;
    const decodedJwt = jwt.verify(credential, JWT_SECRET) as IPasswordCredential;
    const { email } = decodedJwt;

    const userDetail = (await UserModel.findAll({
      where: {
        email_id: email,
        active_status: true,
      },
      raw: true,
    })) as unknown as IUserAccount[];

    // check if user exist
    if (!userDetail.length) {
      throw new AppError(
        `No user found for ${email}. The account may not exist or has been deleted.`,
        HttpStatus.BAD_REQUEST
      );
    }

    // NOTE:
    // check user is entering same password
    // users having same email-id accross all practice accounts hold unique password
    // hence checking password match from the first object userDetails[0];

    const isPasswordMatched = await bcrypt.compare(password, userDetail[0]?.password as string);
    if (isPasswordMatched) {
      throw new AppError('Enter new password.', HttpStatus.BAD_REQUEST);
    }

    const _password = await generateHash(password ?? '');

    for (const user of userDetail) {
      await UserModel.update(
        {
          password: _password,
          password_reset_at: new Date(),
          is_password_reset: true,
        },
        {
          where: {
            id: user.id,
            email_id: email,
          },
        }
      );
    }

    const response = {
      message: 'Password reset successfully',
      status: EResponseStatus.SUCCESS,
    };
    await AuditLogV2({
      request: req,
      response: response ?? {},
    });
    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    const error = errorHandler(err);

    const mapJwtError = ['jwt expired', 'jwt must be provided', 'invalid signature', 'jwt malformed'];
    if (mapJwtError.includes(error.message)) {
      error.message = 'Access denied';
      error.statusCode = HttpStatus.BAD_REQUEST;
    }
    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message ?? '',
    });
    return response;
  }
};
