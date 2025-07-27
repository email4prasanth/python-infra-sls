import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../lib/connections';
import { AuditLogModel } from '../models';

type TEventType = 'GET' | 'POST' | 'PUT' | 'DELETE';
type TOperationStatus = 'SUCCESS' | 'FAILURE';

const PG_ENCRYPT_SECRET = process.env.PG_ENCRYPT_SECRET as string;

export const AuditLog = async (logDetails: {
  practice_account_id: string;
  user_id: string;
  source_ip: string;
  api_path: string;
  request: string;
  response: object;
  event_type: TEventType;
  operation_status: TOperationStatus;
  error_message: string;
}) => {
  try {
    const {
      error_message,
      event_type,
      operation_status,
      practice_account_id,
      api_path,
      request,
      response,
      source_ip,
      user_id,
    } = logDetails;
    await AuditLogModel.create({
      practice_account_id,
      user_id,
      source_ip,
      api_path,
      request,
      response: JSON.stringify(response),
      event_type,
      event_time_stamp: new Date(),
      operation_status,
      error_message,
    });
  } catch (e) {
    console.log(e);
  }
};

export const AuditLogV2 = async (logDetails: {
  request: APIGatewayProxyEventV2;
  response: object;
  error_message?: '' | string;
}) => {
  let _request;

  try {
    const { error_message, request, response } = logDetails;
    const event_type = request.requestContext.http.method;
    if (event_type === 'POST' || event_type === 'PUT') {
      _request = request.body ?? '';
    }
    if (event_type === 'GET') {
      _request = JSON.stringify(request.queryStringParameters ?? {});
    }
    if (event_type === 'DELETE') {
      _request = JSON.stringify(request.queryStringParameters ?? {});
    }

    const insertQuery = `
    INSERT INTO audit_log (
      practice_account_id,
      user_id,
      source_ip,
      api_path,
      request,
      response,
      event_type,
      event_time_stamp,
      operation_status,
      error_message
      )
    VALUES (
      :practice_account_id,
      :user_id,
      :source_ip,
      :api_path,
      pgp_sym_encrypt(:request, :secretKey),
      pgp_sym_encrypt(:response, :secretKey),
      :event_type,
      :event_time_stamp,
      :operation_status,
      :error_message
    )
`;

    await sequelize.query(insertQuery, {
      replacements: {
        practice_account_id: request.headers['practice-id'] ?? '',
        user_id: request.headers['user-id'] ?? '',
        source_ip: request.headers['source-ip'] ?? '',
        api_path: request.rawPath ?? '',
        request: JSON.stringify(_request),
        response: JSON.stringify(response),
        secretKey: PG_ENCRYPT_SECRET,
        event_type,
        event_time_stamp: new Date(),
        operation_status: error_message ? 'FAILURE' : 'SUCCESS',
        error_message: error_message ?? '',
      },
      type: QueryTypes.INSERT,
    });
  } catch (e) {
    console.log('AuditLogV2 Error: ', e);
  }
};
