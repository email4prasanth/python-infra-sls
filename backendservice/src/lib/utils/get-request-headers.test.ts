import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AppError } from '../error';
import { getRequestHeaders } from './get-request-headers';

describe('getRequestHeaders', () => {
  it('should throw an AppError when "source-ip" header is missing', () => {
    const mockEvent = {
      headers: {
        'login-id': 'test-login-id',
        'practice-id': 'test-practice-id',
        'user-id': 'test-user-id',
      },
    } as unknown as APIGatewayProxyEventV2;

    expect(() => getRequestHeaders(mockEvent)).toThrow(AppError);
    expect(() => getRequestHeaders(mockEvent)).toThrow('Missing headers');
  });

  it('should throw an AppError when "login-id" header is missing', () => {
    const mockEvent = {
      headers: {
        'source-ip': 'test-source-ip',
        'practice-id': 'test-practice-id',
        'user-id': 'test-user-id',
      },
    } as unknown as APIGatewayProxyEventV2;

    expect(() => getRequestHeaders(mockEvent)).toThrow(AppError);
    expect(() => getRequestHeaders(mockEvent)).toThrow('Missing headers');
  });

  it('should return correct IRequestHeaders object when all required headers are present', () => {
    const mockEvent = {
      headers: {
        'source-ip': 'test-source-ip',
        'login-id': 'test-login-id',
        'practice-id': 'test-practice-id',
        'user-id': 'test-user-id',
      },
    } as unknown as APIGatewayProxyEventV2;

    const result = getRequestHeaders(mockEvent);

    expect(result).toEqual({
      requesterSourceIp: 'test-source-ip',
      requesterLoginId: 'test-login-id',
      requesterPracticeId: 'test-practice-id',
      requesterUserId: 'test-user-id',
    });
  });
});
