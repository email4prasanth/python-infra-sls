import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../lib/connections';
import { DB_ACTIONS, HttpStatus, RESOURCES } from '../lib/enum';
import { AppError } from '../lib/error';
import { generateHash, getRequestHeaders, hasUserAccess } from '../lib/utils';
import { EMAIL_TEMPLATE } from '../lib/utils/email-builder';
import { authMiddleware, errorHandler, validate } from '../middleware';
import { AuditLogV2 } from '../middleware/audit-log';
import { PracticeSoftwareModel, PracticeUserModel, SpecialityModel, UserModel } from '../models';
import { PracticeAccountModel } from '../models/practice-account.model';
import { registerPracticeAccountSchema, updatePracticeAccountSchema } from '../schemas';
import {
  EResponseStatus,
  ICreatePracticeAccountRequest,
  IGetPracticeAccountRequest,
  IPraciceAccountUpdateRequest,
  IPracticeSoftwareResponse,
  IPracticeSpecialityResponse,
  IRegisterPracticeAccountRequest,
  IRegisterPracticeAccountResponse,
  isAccountAdminExistRequest,
} from '../types';
import { ICreateUserRequest, IUserAccount } from '../types/user.types';
import { getUserRole } from './utils';
import { sendEmailNotification } from './utils/email.service';

export const getPracticeSoftware = async (req: APIGatewayProxyEventV2) => {
  try {
    const softwares = (await PracticeSoftwareModel.findAll({
      attributes: ['id', 'software_name'],
      raw: true,
    })) as unknown as IPracticeSoftwareResponse[];
    await AuditLogV2({
      request: req,
      response: softwares ?? {},
    });
    return softwares;
  } catch (err) {
    const error = errorHandler(err);

    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
    await AuditLogV2({
      request: req,
      response: response,
      error_message: error.message,
    });

    return response;
  }
};

export const getPracticeSpeciality = async () => {
  try {
    const roles = (await SpecialityModel.findAll({
      attributes: ['id', 'speciality_name'],
      raw: true,
    })) as unknown as IPracticeSpecialityResponse[];
    return roles;
  } catch (err) {
    const error = errorHandler(err);
    return {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
  }
};

export const isAccountAdminExist = async (req: APIGatewayProxyEventV2) => {
  const reqParam = req.queryStringParameters as unknown as isAccountAdminExistRequest;
  const emailId = reqParam?.emailId;
  try {
    const roles = await UserModel.findAll({
      where: {
        email_id: emailId,
      },
      raw: true,
    });
    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify({
        status: roles.length > 0 ? EResponseStatus.FAILURE : EResponseStatus.SUCCESS,
        message: roles.length > 0 ? 'Account Owner email already exists' : 'Account Owner available',
      }),
    };
  } catch (err) {
    const error = errorHandler(err);
    return {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
  }
};

export const createPracticeAccount = async (
  practiceInfo: ICreatePracticeAccountRequest,
  verifyAccount: { hasDea: boolean }
): Promise<{ practiceAccountId: string }> => {
  try {
    const {
      practiceName,
      address1,
      address2,
      city,
      state,
      zip,
      officeEmail,
      officePhone,
      websiteAddress,
      specialityId,
      specialityName,
      practiceSoftwareId,
      practiceSoftwareName,
      hasAcceptedTerms,
      countryId,
      country,
    } = practiceInfo;

    const result = await PracticeAccountModel.create({
      practice_name: practiceName,
      address1: address1,
      address2: address2,
      city: city,
      state: state,
      zip: zip,
      office_email: officeEmail,
      office_phone: officePhone,
      website_address: websiteAddress,
      speciality_id: specialityId,
      speciality_name: specialityName,
      practice_software_id: practiceSoftwareId,
      practice_software_name: practiceSoftwareName,
      has_accepted_terms: hasAcceptedTerms,
      created_at: new Date(),
      active_status: true,
      account_verified: verifyAccount.hasDea,
      country_id: countryId,
      country: country,
    });

    return { practiceAccountId: result.get().id };
  } catch (err) {
    throw err as AppError;
  }
};

export const createUser = async (
  userInfo: ICreateUserRequest,
  userRole: { isAccountOwner: boolean }
): Promise<{ userId: string; practiceUserId: string; emailFlag: EMAIL_TEMPLATE }> => {
  let accountVerified = '';
  try {
    // Verify whether the email ID is already associated with any practice account for the Account Owner role.
    const accountOwnerExist = `
    SELECT *
    FROM 
      user_account AS ud, 
      practice_user AS pu
    WHERE 
      ud.id = pu.user_id
      AND
      ud.email_id = '${userInfo.emailId}'
      AND
	    pu.role = '${userInfo.role}'`;

    // Verify whether the email ID is already associated within the practice account.
    const userExist = `
    SELECT *
    FROM 
      user_account AS ud, 
      practice_user AS pu
    WHERE 
      ud.id = pu.user_id
      AND
      ud.email_id = '${userInfo.emailId}'
      AND
      pu.practice_account_id = '${userInfo.practiceAccountId}'`;

    const existanceQuery = userRole.isAccountOwner ? accountOwnerExist : userExist;
    const isUserExists = await sequelize.query(existanceQuery, {
      type: QueryTypes.SELECT,
    });

    if (isUserExists.length > 0) {
      const errorMessage = userRole.isAccountOwner
        ? `Account Owner email '${userInfo.emailId}' already exists`
        : `User email '${userInfo.emailId}' already exists`;
      throw new AppError(errorMessage, HttpStatus.BAD_REQUEST);
    }

    const {
      practiceAccountId,
      firstName,
      lastName,
      emailId,
      has2fa,
      // doctorEmailId,
      phoneNumber,
      roleId,
      role,
      dea,
      licenseNumber,
      stateId,
      stateOfIssue,
      password,
    } = userInfo;

    // hash password
    const _password = await generateHash(password ?? '');

    // account verification is true only for doctors with valid DEA
    // if License number is provided instead of DEA, it is manually validated by system admin
    // account verification remains true for all other users (admin/staff/system admin)

    if (role === 'Doctor' || role === 'Account Owner') {
      accountVerified = dea ? 'verified' : 'pending';
    } else {
      accountVerified = 'verified';
    }

    const hasUserWithEmailExist = (await UserModel.findAll({
      where: {
        email_id: userInfo.emailId,
        password: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
        },
        active_status: true,
      },
    })) as unknown as IUserAccount[];

    const previouslyConfiguredPassword = hasUserWithEmailExist?.length > 0 ? hasUserWithEmailExist[0].password : null;

    // NOTE:
    // new account-owner -> email-invitation
    // new user(admin/doctor/sysadmin/staff) -> set-password
    // existing user -> email-invitation -> preset with previously existing password
    // admin/doctor/sysadmin/staff come admin -> don't allow to set password in FE sign up page. preset with existing password. Don't show password field in FE form. Discuss with Abhishek and confirm.

    const emailFlagType =
      role === 'Account Owner'
        ? EMAIL_TEMPLATE.INVITATION
        : previouslyConfiguredPassword
          ? EMAIL_TEMPLATE.INVITATION
          : EMAIL_TEMPLATE.SET_PASSWORD;

    const userResult = await UserModel.create({
      first_name: firstName,
      last_name: lastName,
      email_id: emailId,
      phone_number: phoneNumber,
      password: role === 'Account Owner' ? _password : previouslyConfiguredPassword,
      active_status: true,
      is_password_active: role === 'Account Owner' ? true : false,
      created_at: new Date(),
    });

    const practiceResult = await PracticeUserModel.create({
      practice_account_id: practiceAccountId,
      user_id: userResult.get().id,
      has_2fa: has2fa,
      role_id: roleId,
      role: role,
      dea: dea,
      license_number: licenseNumber,
      state_id: stateId,
      state_of_issue: stateOfIssue,
      account_verified: accountVerified,
      active_status: true,
      created_at: new Date(),
    });
    return {
      userId: userResult.get().id,
      practiceUserId: practiceResult.get().id,
      emailFlag: emailFlagType,
    }; // return inserted id
  } catch (err) {
    throw err as AppError;
  }
};

// registerPracticeAccount is triggered only during registration process
export const registerPracticeAccount = async (req: APIGatewayProxyEventV2) => {
  let practiceAccountId: string | undefined;
  // eslint-disable-next-line prefer-const
  let insertedUserId: string[] = [];
  try {
    const reqBody = JSON.parse(req?.body as string) as unknown as IRegisterPracticeAccountRequest;

    // validate request body
    validate(registerPracticeAccountSchema, reqBody);

    const { doctorInfo, practiceInfo, userInfo } = reqBody;

    // create practice account
    const registerPracticeAccount = await createPracticeAccount(practiceInfo, {
      hasDea: doctorInfo.dea ? true : false,
    });
    practiceAccountId = registerPracticeAccount.practiceAccountId;

    // create doctor account
    // The individual who register a practice account will serve as the Account Owner.
    doctorInfo.practiceAccountId = practiceAccountId;
    // doctorInfo.isPasswordActive = true;

    const _createDoctor = await createUser(doctorInfo, { isAccountOwner: true });

    insertedUserId?.push(_createDoctor.userId);
    await sendEmailNotification({
      userId: _createDoctor.userId,
      practiceId: practiceAccountId as string,
      userName: `${doctorInfo.firstName} ${doctorInfo.lastName}`,
      email: doctorInfo.emailId,
      role: doctorInfo.role,
      template: _createDoctor.emailFlag, // send invitation email for account owner
    });

    // create user account
    for (const user of userInfo) {
      user.practiceAccountId = practiceAccountId;
      // user.isPasswordActive = false;
      const _createUser = await createUser(user, { isAccountOwner: false });

      insertedUserId?.push(_createUser.userId);
      await sendEmailNotification({
        userId: _createUser.userId,
        practiceId: practiceAccountId as string,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.emailId,
        role: user.role,
        template: _createUser.emailFlag, // send set password email for users
      });
    }

    const response: IRegisterPracticeAccountResponse = {
      message: 'Practice account registered successfully',
      status: EResponseStatus.SUCCESS,
    };

    await AuditLogV2({
      request: req,
      response: response,
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    // rollback transaction
    // since practice_id & user_id is FK of practice_user table,
    // delete practice_user first and then user_account & practice_account

    //1. delete practice_user
    if (insertedUserId?.length > 0) {
      for (const practiceUserId of insertedUserId) {
        await PracticeUserModel.destroy({
          where: {
            user_id: practiceUserId,
            practice_account_id: practiceAccountId,
          },
        });
      }
    }

    // 2. delete user_account
    if (insertedUserId?.length > 0) {
      for (const userId of insertedUserId) {
        await UserModel.destroy({
          where: {
            id: userId,
          },
        });
      }
    }

    // 3. delete practice_account
    await PracticeAccountModel.destroy({
      where: {
        id: practiceAccountId,
      },
    });

    const error = errorHandler(err);

    const response = {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
      error_message: error.message,
    });

    return response;
  }
};

// NOTE:
// updatePracticeAccount is triggered from setting page which is accessable after login
// so it requires authentication details & headers
export const updatePracticeAccount = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req?.body as string) as unknown as IPraciceAccountUpdateRequest;
    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(updatePracticeAccountSchema, reqBody);

    const {
      id,
      practiceName,
      address1,
      address2,
      city,
      state,
      zip,
      officeEmail,
      officePhone,
      websiteAddress,
      specialityId,
      specialityName,
      practiceSoftwareId,
      practiceSoftwareName,
      hasAcceptedTerms,
      countryId,
      country,
    } = reqBody;

    // check if user has permission to update practice
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    const hasUpdateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PRACTICE_ACCOUNT, DB_ACTIONS.UPDATE);
    if (!hasUpdateAccess) {
      throw new AppError('You do not have permission to create user', HttpStatus.FORBIDDEN);
    }

    await PracticeAccountModel.update(
      {
        practice_name: practiceName,
        address1: address1,
        address2: address2,
        city: city,
        state: state,
        zip: zip,
        office_email: officeEmail,
        office_phone: officePhone,
        website_address: websiteAddress,
        speciality_id: specialityId,
        speciality_name: specialityName,
        practice_software_id: practiceSoftwareId,
        practice_software_name: practiceSoftwareName,
        has_accepted_terms: hasAcceptedTerms,
        country_id: countryId,
        country: country,
        updated_at: new Date(),
        updated_by: req.headers['user-id'] ?? '',
      },
      {
        where: {
          id,
        },
      }
    );

    const response = {
      message: 'Practice account updated successfully',
      status: EResponseStatus.SUCCESS,
      id,
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

// NOTE:
// getPracticeAccount is triggered from setting page which is accessable after login
// so it requires authentication details & headers
export const getPracticeAccount = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const practiceAccountId = req.queryStringParameters as unknown as IGetPracticeAccountRequest;

    // validate auth
    await authMiddleware(req);

    if (!practiceAccountId.id) {
      throw new AppError('Practice account id not found', HttpStatus.BAD_REQUEST);
    }

    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasViewAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PRACTICE_ACCOUNT, DB_ACTIONS.VIEW);
    if (!hasViewAccess) {
      throw new AppError('You do not have permission to view practice', HttpStatus.FORBIDDEN);
    }

    const practiceAccount = await PracticeAccountModel.findOne({
      where: {
        id: practiceAccountId.id,
        active_status: true,
      },
      raw: true,
    });

    await AuditLogV2({
      request: req,
      response: practiceAccount ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(practiceAccount),
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
