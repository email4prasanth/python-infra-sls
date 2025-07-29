import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../lib/connections';
import { DB_ACTIONS, HttpStatus, RESOURCES } from '../lib/enum';
import { AppError } from '../lib/error';
import { getRequestHeaders, hasUserAccess } from '../lib/utils';
import { EMAIL_TEMPLATE } from '../lib/utils/email-builder';
import { authMiddleware, errorHandler, validate } from '../middleware';
import { AuditLogV2 } from '../middleware/audit-log';
import { PracticeUserModel, RoleModel, UserModel } from '../models';
import { createUserSchema, updateUserSchema, userListSchema } from '../schemas';
import { EResponseStatus } from '../types';
import {
  ICreateUserRequest,
  IDeleteUserRequest,
  IGetAllUsersRequest,
  IGetUserRequest,
  IUpdateUserRequest,
  IUserAccount,
  IUserRoleResponse,
} from '../types/user.types';
import { getPaginatedData, getUserRole, sendEmailNotification, userRoleFilter } from './utils';

export const getUserRoleList = async () => {
  try {
    const roles = (await RoleModel.findAll({
      attributes: ['id', 'role_name'],
      raw: true,
    })) as unknown as IUserRoleResponse[];
    return roles;
  } catch (err) {
    const error = errorHandler(err);
    return {
      statusCode: error.statusCode,
      body: JSON.stringify(error),
    };
  }
};

export const createUser = async (req: APIGatewayProxyEventV2) => {
  try {
    let accountVerified = '';
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req?.body as string) as unknown as ICreateUserRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(createUserSchema, reqBody);

    const {
      dea,
      emailId,
      firstName,
      has2fa,
      lastName,
      licenseNumber,
      // password,
      phoneNumber,
      role,
      roleId,
      stateId,
      stateOfIssue,
      // doctorEmailId,
    } = reqBody;

    // check if user has permission to create user
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasCreateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_USER, DB_ACTIONS.INSERT);
    if (!hasCreateAccess) {
      throw new AppError('You do not have permission to create user', HttpStatus.FORBIDDEN);
    }

    const existanceQuery = `
     SELECT *
    FROM
      practice_user AS pu,
      user_account AS ua
    WHERE
      pu.user_id = ua.id
      AND
      ua.email_id = :emailId
      AND
      pu.practice_account_id = :practiceAccountId
      AND
      pu.active_status = true`;

    const isUserExists = await sequelize.query(existanceQuery, {
      type: QueryTypes.SELECT,
      replacements: {
        emailId,
        practiceAccountId: requesterPracticeId,
      },
    });

    // check if user already exists within the practice
    if (isUserExists.length > 0) {
      throw new AppError(`User email '${emailId}' already exists`, HttpStatus.BAD_REQUEST);
    }

    if (role === 'Doctor' || role === 'Account Owner') {
      accountVerified = dea ? 'verified' : 'pending';
    } else {
      accountVerified = 'verified';
    }

    const hasUserWithEmailExist = (await UserModel.findAll({
      where: {
        email_id: emailId,
        password: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
        },
        active_status: true,
      },
    })) as unknown as IUserAccount[];

    const previouslyConfiguredPassword = hasUserWithEmailExist?.length > 0 ? hasUserWithEmailExist[0].password : '';

    const emailFlagType = previouslyConfiguredPassword ? EMAIL_TEMPLATE.INVITATION : EMAIL_TEMPLATE.SET_PASSWORD;

    const userResult = await UserModel.create({
      first_name: firstName,
      last_name: lastName,
      email_id: emailId,
      phone_number: phoneNumber,
      password: previouslyConfiguredPassword ?? '', // preset password with existing password
      active_status: true,
      created_at: new Date(),
      created_by: requesterUserId,
    });

    await PracticeUserModel.create({
      practice_account_id: requesterPracticeId,
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
      created_by: requesterUserId,
    });

    await sendEmailNotification({
      userId: userResult.get().id,
      practiceId: requesterPracticeId,
      userName: `${firstName} ${lastName}`,
      email: emailId,
      role: role,
      template: emailFlagType, // send invitation email or password set email
    });

    const response = {
      message: 'User created successfully',
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
      error_message: error.message,
    });

    return response;
  }
};

export const updateUser = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req?.body as string) as unknown as IUpdateUserRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(updateUserSchema, reqBody);

    const {
      id: userId,
      dea,
      emailId,
      firstName,
      has2fa,
      lastName,
      licenseNumber,
      phoneNumber,
      role,
      roleId,
      stateId,
      stateOfIssue,
      // doctorEmailId,
    } = reqBody;

    // check if user has permission to edit user
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasUpdateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_USER, DB_ACTIONS.UPDATE);
    if (!hasUpdateAccess) {
      throw new AppError('You do not have permission to edit user', HttpStatus.FORBIDDEN);
    }

    await UserModel.update(
      {
        first_name: firstName,
        last_name: lastName,
        email_id: emailId,
        phone_number: phoneNumber,
        updated_at: new Date(),
        updated_by: requesterUserId,
      },
      {
        where: {
          id: userId,
        },
      }
    );

    await PracticeUserModel.update(
      {
        practice_account_id: requesterPracticeId,
        has_2fa: has2fa,
        role_id: roleId,
        role: role,
        dea: dea,
        license_number: licenseNumber,
        state_id: stateId,
        state_of_issue: stateOfIssue,
        active_status: true,
        updated_at: new Date(),
        updated_by: requesterUserId,
      },
      {
        where: {
          user_id: userId,
          practice_account_id: requesterPracticeId,
        },
      }
    );

    const response = {
      message: 'User updated successfully',
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
      error_message: error.message,
    });

    return response;
  }
};

export const deleteUser = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqParams = req.queryStringParameters as unknown as IDeleteUserRequest;
    const { userId } = reqParams;

    // check if requester user is not deleting his own account
    if (requesterUserId === userId) {
      throw new AppError('You cannot delete your own account', HttpStatus.BAD_REQUEST);
    }
    // validate auth
    await authMiddleware(req);

    // check if user has permission to delete user
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasDeleteAccess = hasUserAccess(userRole, RESOURCES.MANAGE_USER, DB_ACTIONS.DELETE);
    if (!hasDeleteAccess) {
      throw new AppError('You do not have permission to delete user', HttpStatus.FORBIDDEN);
    }

    // soft delete user account by setting active_status to false
    await UserModel.update(
      {
        active_status: false,
        updated_by: requesterUserId,
        updated_at: new Date(),
      },
      {
        where: {
          id: userId,
        },
      }
    );

    await PracticeUserModel.update(
      {
        active_status: false,
        updated_by: requesterUserId,
        updated_at: new Date(),
      },
      {
        where: {
          user_id: userId,
          practice_account_id: requesterPracticeId,
        },
      }
    );

    const response = {
      message: 'User deleted successfully',
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
      error_message: error.message,
    });

    return response;
  }
};

export const getAllUsers = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req.body as string) as unknown as IGetAllUsersRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(userListSchema, reqBody);
    const { limit, page, practiceAccountId, role } = reqBody;

    // check if user has permission to view user
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);

    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasViewAccess = hasUserAccess(userRole, RESOURCES.MANAGE_USER, DB_ACTIONS.VIEW);
    if (!hasViewAccess) {
      throw new AppError('You do not have permission to view users', HttpStatus.FORBIDDEN);
    }

    UserModel.hasMany(PracticeUserModel, { foreignKey: 'user_id' });
    PracticeUserModel.belongsTo(UserModel, { foreignKey: 'user_id' });

    const paginatedUserList = await getPaginatedData(
      PracticeUserModel,
      {
        include: [
          {
            model: UserModel,
            required: true,
            attributes: {
              exclude: ['readable_id', 'password', 'created_by', 'updated_by', 'created_at', 'updated_at'],
            }, // specify needed columns from User
          },
        ],
        attributes: {
          exclude: ['id', 'user_id', 'created_by', 'updated_by', 'created_at', 'updated_at'], // specify needed columns from PracticeUser
        },
        where: {
          practice_account_id: practiceAccountId,
          role: {
            [Op.in]: userRoleFilter(role),
          },
          active_status: true,
        },
        order: [['readable_id', 'DESC']],
        raw: true,
        nest: true,
      },
      limit,
      page
    );

    const mapPaginatedList = {
      pagination: paginatedUserList.pagination,
      list: paginatedUserList.list.map((item) => {
        const { user_account, ...rest } = item; // flatten user_account
        return { ...user_account, ...rest };
      }),
    };

    await AuditLogV2({
      request: req,
      response: mapPaginatedList,
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(mapPaginatedList),
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

export const getUserById = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const { userId } = req.queryStringParameters as unknown as IGetUserRequest;

    // validate auth
    await authMiddleware(req);

    if (!userId) {
      throw new AppError('User id not found', HttpStatus.BAD_REQUEST);
    }

    // check if user has permission to view user
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }

    const hasViewAccess = hasUserAccess(userRole, RESOURCES.MANAGE_USER, DB_ACTIONS.VIEW);
    if (!hasViewAccess) {
      throw new AppError('You do not have permission to view user', HttpStatus.FORBIDDEN);
    }

    UserModel.hasMany(PracticeUserModel, { foreignKey: 'user_id' });
    PracticeUserModel.belongsTo(UserModel, { foreignKey: 'user_id' });

    const userDetail = (await PracticeUserModel.findOne({
      include: [
        {
          model: UserModel,
          required: true,
          attributes: {
            exclude: ['readable_id', 'password', 'created_by', 'updated_by', 'created_at', 'updated_at'],
          }, // specify needed columns from User
        },
      ],
      attributes: {
        exclude: ['id', 'user_id', 'created_by', 'updated_by', 'created_at', 'updated_at'], // specify needed columns from PracticeUser
      },
      where: {
        user_id: userId,
        practice_account_id: requesterPracticeId,
        active_status: true,
      },
      raw: true,
      nest: true,
    })) as unknown as { [key: string]: string | object; user_account: { [key: string]: string } };

    const { user_account, ...rest } = userDetail;
    const mapUserDetail = { ...user_account, ...rest };

    await AuditLogV2({
      request: req,
      response: mapUserDetail ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(mapUserDetail),
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
