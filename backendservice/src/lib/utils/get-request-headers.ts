import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { IRequestHeaders } from '../../types';
import { HttpStatus } from '../enum';
import { AppError } from '../error';

export const getRequestHeaders = (req: APIGatewayProxyEventV2): IRequestHeaders => {
  const requesterSourceIp = req.headers['source-ip'];
  const requesterLoginId = req.headers['login-id'];
  const requesterPracticeId = req.headers['practice-id'];
  const requesterUserId = req.headers['user-id'];

  if (!requesterPracticeId || !requesterUserId || !requesterLoginId || !requesterSourceIp) {
    throw new AppError('Missing headers', HttpStatus.BAD_REQUEST);
  }

  return {
    requesterSourceIp,
    requesterLoginId,
    requesterPracticeId,
    requesterUserId,
  };
};
