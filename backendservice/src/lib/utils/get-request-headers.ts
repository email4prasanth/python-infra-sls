import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { IRequestHeaders } from '../../types';
import { HttpStatus } from '../enum';
import { AppError } from '../error';

export const getRequestHeaders = (req: APIGatewayProxyEventV2): IRequestHeaders => {
  // const headers = req.headers || {};

  // // Make headers optional for public endpoints
  // const isPublicEndpoint = ['/practice/software', '/practice/speciality'].includes(req.rawPath);

  // if (isPublicEndpoint) {
  //   return {
  //     requesterSourceIp: headers['source-ip'] || '',
  //     requesterLoginId: headers['login-id'] || '',
  //     requesterPracticeId: headers['practice-id'] || '',
  //     requesterUserId: headers['user-id'] || '',
  //   };
  // }

  // Validate required headers for non-public endpoints
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
