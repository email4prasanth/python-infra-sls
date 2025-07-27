import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { HttpStatus } from '../lib/enum';
import { AppError } from '../lib/error';
import { getRequestHeaders } from '../lib/utils';
import { AuditLogV2, authMiddleware, errorHandler, validate } from '../middleware';
import { UserModel } from '../models';
import { securityUpdateSchema } from '../schemas';
import { EResponseStatus, ISecurityUpdateRequest, IUserAccount } from '../types';
import { getUserRole } from './utils';

// NOTE:
// Login user can update their own account details.
export const updateSecurity = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req?.body as string) as unknown as ISecurityUpdateRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(securityUpdateSchema, reqBody);

    const { emailId, phoneNumber } = reqBody;

    // NOTE:
    // login user can update their own account, hence hasUserAccess check is not needed.
    // only check active status of the user(exist or not)
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // user does not exist in the practice acount (account deleted or not exist)
      // hence deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }

    const userWithEmailId = (await UserModel.findAll({
      where: {
        email_id: emailId,
        active_status: true,
      },
      raw: true,
    })) as unknown as IUserAccount[];

    for (const user of userWithEmailId) {
      await UserModel.update(
        {
          email_id: emailId,
          phone_number: phoneNumber,
        },
        {
          where: {
            id: user.id,
            active_status: true,
          },
        }
      );
    }

    const response = {
      message: 'Security details updated successfully',
      status: EResponseStatus.SUCCESS,
    };

    await AuditLogV2({
      request: req,
      response: response ?? {},
    });

    return {
      statusCode: 200,
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
