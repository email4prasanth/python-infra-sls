import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { initDB } from './lib/connections';
import {
  authServices,
  patientServices,
  practiceServices,
  securityServices,
  stateServices,
  userServices,
} from './services';

const API_ROOT_PATH = process.env.API_ROOT_PATH;
let isDBInitialized = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TServiceHandler = (req: APIGatewayProxyEventV2) => Promise<any>;

const mapToPracticeService: Record<string, TServiceHandler> = {
  [`/${API_ROOT_PATH}/practice/software`]: practiceServices.getPracticeSoftware,
  [`/${API_ROOT_PATH}/practice/speciality`]: practiceServices.getPracticeSpeciality,
  [`/${API_ROOT_PATH}/practice`]: practiceServices.getPracticeAccount,
  [`/${API_ROOT_PATH}/practice/register`]: practiceServices.registerPracticeAccount,
  [`/${API_ROOT_PATH}/practice/update`]: practiceServices.updatePracticeAccount,
  [`/${API_ROOT_PATH}/practice/accountAdminAvailability`]: practiceServices.isAccountAdminExist,
};

const mapToUserService: Record<string, TServiceHandler> = {
  [`/${API_ROOT_PATH}/user/role`]: userServices.getUserRoleList,
  [`/${API_ROOT_PATH}/user/list`]: userServices.getAllUsers,
  [`/${API_ROOT_PATH}/user/detail`]: userServices.getUserById,
  [`/${API_ROOT_PATH}/user/create`]: userServices.createUser,
  [`/${API_ROOT_PATH}/user/update`]: userServices.updateUser,
  [`/${API_ROOT_PATH}/user/delete`]: userServices.deleteUser,
};

const mapToStateService: Record<string, TServiceHandler> = {
  [`/${API_ROOT_PATH}/state/list`]: stateServices.getStatesList,
};

const mapToAuthService: Record<string, TServiceHandler> = {
  [`/${API_ROOT_PATH}/auth/login`]: authServices.login,
  [`/${API_ROOT_PATH}/auth/selectLoginPracticeAccount`]: authServices.selectLoginPracticeAccount,
  [`/${API_ROOT_PATH}/auth/verifyOtp`]: authServices.verifyOtp,
  [`/${API_ROOT_PATH}/auth/completion`]: authServices.loginCompletion,

  [`/${API_ROOT_PATH}/auth/resendOtp`]: authServices.resendOtp,
  [`/${API_ROOT_PATH}/auth/refreshToken`]: authServices.refreshToken,
  [`/${API_ROOT_PATH}/auth/me`]: authServices.me,
  [`/${API_ROOT_PATH}/auth/setPassword`]: authServices.setPassword,
  [`/${API_ROOT_PATH}/auth/forgotPassword`]: authServices.forgotPassword,
  [`/${API_ROOT_PATH}/auth/resetPassword`]: authServices.resetPassword,
};

const mapToPatientService: Record<string, TServiceHandler> = {
  [`/${API_ROOT_PATH}/patient/list`]: patientServices.getAllPatient,
  [`/${API_ROOT_PATH}/patient/detail`]: patientServices.getPatientById,
  [`/${API_ROOT_PATH}/patient/create`]: patientServices.createPatient,
  [`/${API_ROOT_PATH}/patient/update`]: patientServices.updatePatient,
  [`/${API_ROOT_PATH}/patient/search`]: patientServices.searchPatient,
  [`/${API_ROOT_PATH}/patient/delete`]: patientServices.deletePatient,
};

const mapToSecurityService: Record<string, TServiceHandler> = {
  [`/${API_ROOT_PATH}/security/update`]: securityServices.updateSecurity,
};

const ensureDBInit = async () => {
  if (!isDBInitialized) {
    console.log('Initializing DB...');
    await initDB();
    isDBInitialized = true;
  }
};

export const practiceHandler = async (event: APIGatewayProxyEventV2) => {
  await ensureDBInit();
  const result = await mapToPracticeService[event.rawPath](event);
  return result;
};

export const userHandler = async (event: APIGatewayProxyEventV2) => {
  await ensureDBInit();
  const result = await mapToUserService[event.rawPath](event);
  return result;
};

export const stateHandler = async (event: APIGatewayProxyEventV2) => {
  await ensureDBInit();
  const result = await mapToStateService[event.rawPath](event);
  return result;
};

export const authHandler = async (event: APIGatewayProxyEventV2) => {
  await ensureDBInit();
  const result = await mapToAuthService[event.rawPath](event);
  return result;
};

export const securityHandler = async (event: APIGatewayProxyEventV2) => {
  await ensureDBInit();
  const result = await mapToSecurityService[event.rawPath](event);
  return result;
};

export const patientHandler = async (event: APIGatewayProxyEventV2) => {
  await ensureDBInit();
  const result = await mapToPatientService[event.rawPath](event);
  return result;
};

export const hello = async () => {
  console.log('HELLO FUNCTION TRIGGERED');
  
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Test lumifi Serverless fourth time 15-07-25!' }),
    };
  } catch (error) {
    console.error('Error in hello handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error-500' }),
    };
  }
};
