import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Op } from 'sequelize';
import { DB_ACTIONS, HttpStatus, RESOURCES } from '../lib/enum';
import { AppError } from '../lib/error';
import { getRequestHeaders, hasUserAccess } from '../lib/utils';
import { AuditLogV2, authMiddleware, errorHandler, validate } from '../middleware';
import { PatientModel } from '../models';
import { createPatientSchema, patientListSchema, patientSearchSchema, updatePatientSchema } from '../schemas';
import {
  EResponseStatus,
  ICreatePatientRequest,
  IDeletePatientRequest,
  IGetAllPatientRequest,
  IGetPatientRequest,
  ISearchPatientRequest,
  IUpdatePatientRequest,
} from '../types';
import { getPaginatedData, getUserRole } from './utils';

export const createPatient = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req?.body as string) as unknown as ICreatePatientRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(createPatientSchema, reqBody);

    const { dob, emailId, firstName, lastName, phoneNumber } = reqBody;

    // check if user has permission to create user
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasCreateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PATIENT, DB_ACTIONS.INSERT);
    if (!hasCreateAccess) {
      throw new AppError('You do not have permission to create patiet', HttpStatus.FORBIDDEN);
    }

    await PatientModel.create({
      practice_account_id: [requesterPracticeId],
      first_name: firstName,
      last_name: lastName,
      dob: dob,
      email_id: emailId,
      phone_number: phoneNumber,
      created_by: requesterUserId,
      created_at: new Date(),
      active_status: true,
    });

    const response = {
      message: 'Patient created successfully',
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

export const updatePatient = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req?.body as string) as unknown as IUpdatePatientRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(updatePatientSchema, reqBody);

    const { id, dob, emailId, firstName, lastName, phoneNumber } = reqBody;

    // check if user has permission to create user
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasCreateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PATIENT, DB_ACTIONS.UPDATE);
    if (!hasCreateAccess) {
      throw new AppError('You do not have permission to update patient', HttpStatus.FORBIDDEN);
    }

    const isPatientExist = await PatientModel.findOne({
      where: { id: id, practice_account_id: [requesterPracticeId], active_status: true },
      raw: true,
    });

    if (!isPatientExist) {
      throw new AppError('Patient does not exist', HttpStatus.BAD_REQUEST);
    }

    await PatientModel.update(
      {
        first_name: firstName,
        last_name: lastName,
        dob: dob,
        email_id: emailId,
        phone_number: phoneNumber,
        updated_by: requesterUserId,
        updated_at: new Date(),
      },
      {
        where: {
          id: id,
          practice_account_id: [requesterPracticeId],
        },
      }
    );

    const response = {
      message: 'Patient updated successfully',
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

//NOTE:
//this endpoint function is not needed, but keeping it for any future queries.
// a patient cannot be deleted from the system
export const deletePatient = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqParams = req?.queryStringParameters as unknown as IDeletePatientRequest;

    // validate auth
    await authMiddleware(req);

    const { id: patientId } = reqParams;
    // validate request
    if (!patientId) {
      throw new AppError('Patient ID is required', HttpStatus.BAD_REQUEST);
    }

    // check if user has permission to delete patient
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasCreateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PATIENT, DB_ACTIONS.DELETE);
    if (!hasCreateAccess) {
      throw new AppError('You do not have permission to delete patient', HttpStatus.FORBIDDEN);
    }

    const isPatientExist = await PatientModel.findOne({
      where: { id: patientId, practice_account_id: [requesterPracticeId], active_status: true },
      raw: true,
    });

    if (!isPatientExist) {
      throw new AppError('Patient does not exist', HttpStatus.BAD_REQUEST);
    }

    await PatientModel.update(
      {
        active_status: false,
        updated_by: requesterUserId,
        updated_at: new Date(),
      },
      {
        where: {
          id: patientId,
          practice_account_id: [requesterPracticeId],
        },
      }
    );

    const response = {
      message: 'Patient deleted successfully',
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

// NOTE:
// this endpoint function is not needed, but keeping it for any future queries.
export const getAllPatient = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req.body as string) as unknown as IGetAllPatientRequest;

    // validate auth
    await authMiddleware(req);

    // validate request body
    validate(patientListSchema, reqBody);
    const { limit, page, practiceAccountId } = reqBody;

    // check if user has permission to view patient
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasCreateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PATIENT, DB_ACTIONS.VIEW);
    if (!hasCreateAccess) {
      throw new AppError('You do not have permission to view patient', HttpStatus.FORBIDDEN);
    }

    const paginatedUserList = await getPaginatedData(
      PatientModel,
      {
        attributes: {
          exclude: [
            'place_holder1',
            'place_holder2',
            'place_holder3',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
          ],
        },
        where: {
          practice_account_id: [practiceAccountId],
          active_status: true,
        },
        order: [['readable_id', 'DESC']],
        raw: true,
      },
      limit,
      page
    );

    await AuditLogV2({
      request: req,
      response: paginatedUserList ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(paginatedUserList),
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

export const getPatientById = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqParams = req?.queryStringParameters as unknown as IGetPatientRequest;

    // validate auth
    await authMiddleware(req);

    const { id: patientId } = reqParams;
    // validate request
    if (!patientId) {
      throw new AppError('Patient ID is required', HttpStatus.BAD_REQUEST);
    }

    // check if user has permission to view patient
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasCreateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PATIENT, DB_ACTIONS.VIEW);
    if (!hasCreateAccess) {
      throw new AppError('You do not have permission to view patient', HttpStatus.FORBIDDEN);
    }

    const patientDetail = await PatientModel.findOne({
      attributes: {
        exclude: [
          'place_holder1',
          'place_holder2',
          'place_holder3',
          'created_by',
          'updated_by',
          'created_at',
          'updated_at',
        ],
      },
      where: { id: patientId, practice_account_id: [requesterPracticeId], active_status: true },
      raw: true,
    });

    await AuditLogV2({
      request: req,
      response: patientDetail ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(patientDetail ?? {}),
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

export const searchPatient = async (req: APIGatewayProxyEventV2) => {
  try {
    const { requesterPracticeId, requesterUserId } = getRequestHeaders(req);
    const reqBody = JSON.parse(req?.body as string) as unknown as ISearchPatientRequest;

    // validate auth
    await authMiddleware(req);

    // validate request
    validate(patientSearchSchema, reqBody);

    const { dob, firstName, lastName } = reqBody;

    // check if user has permission to view patient
    const userRole = await getUserRole(requesterPracticeId, requesterUserId);
    if (!userRole) {
      // deleted user should not be accessed
      throw new AppError('Account does not exist', HttpStatus.UNAUTHORIZED);
    }
    const hasCreateAccess = hasUserAccess(userRole, RESOURCES.MANAGE_PATIENT, DB_ACTIONS.VIEW);
    if (!hasCreateAccess) {
      throw new AppError('You do not have permission to view patient', HttpStatus.FORBIDDEN);
    }

    const patientDetail = await PatientModel.findAll({
      attributes: {
        exclude: [
          'practice_account_id',
          'place_holder1',
          'place_holder2',
          'place_holder3',
          'created_by',
          'updated_by',
          'created_at',
          'updated_at',
        ],
      },
      where: {
        [Op.and]: {
          dob: dob,
          first_name: firstName,
          last_name: lastName,
          active_status: true,
        },
      },
      raw: true,
    });

    // NOTE:
    // remove static setting of implant after implementation of implant in FE
    const _patientDetail = patientDetail.map((items) => ({ ...items, implants: [] }));

    await AuditLogV2({
      request: req,
      response: _patientDetail ?? {},
    });

    return {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(_patientDetail ?? {}),
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
