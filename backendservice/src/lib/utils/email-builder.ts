import { invitationTemplate, otpTemplate, resetPasswordTemplate, setPasswordTemplate } from '../email-templates';
import { HttpStatus } from '../enum';
import { AppError } from '../error';

export enum EMAIL_TEMPLATE {
  ACCOUNT_DEACTIVATION = 'ACCOUNT_DEACTIVATION',
  INVITATION = 'INVITATION',
  ACCOUNT_REACTIVATION = 'ACCOUNT_REACTIVATION',
  RESET_PASSWORD = 'RESET_PASSWORD',
  SET_PASSWORD = 'SET_PASSWORD',
  OTP = 'OTP',
}

type TemplateFunction = ({ key1, key2 }: { key1: string; key2: string }) => string;

interface EmailTemplates {
  [key: string]: TemplateFunction;
}

const EMAIL_TEMPLATES: EmailTemplates = {
  [EMAIL_TEMPLATE.SET_PASSWORD]: setPasswordTemplate,
  [EMAIL_TEMPLATE.RESET_PASSWORD]: resetPasswordTemplate,
  [EMAIL_TEMPLATE.INVITATION]: invitationTemplate,
  [EMAIL_TEMPLATE.OTP]: otpTemplate,
};

const mapEmailSubject = (template: EMAIL_TEMPLATE) => {
  const functionMap = {
    [EMAIL_TEMPLATE.ACCOUNT_DEACTIVATION]: 'Lumifi Account Deactivation',
    [EMAIL_TEMPLATE.INVITATION]: 'Lumifi Invitation',
    [EMAIL_TEMPLATE.ACCOUNT_REACTIVATION]: 'Lumifi Account Reactivation',
    [EMAIL_TEMPLATE.RESET_PASSWORD]: 'Lumifi Reset Password',
    [EMAIL_TEMPLATE.SET_PASSWORD]: 'Lumifi Account Verfication',
    [EMAIL_TEMPLATE.OTP]: 'Lumifi OTP',
  };
  return functionMap[template];
};

const getHttpLink = (template: EMAIL_TEMPLATE, authToken: string | null) => {
  const functionMap: { [key: string]: string } = {
    [EMAIL_TEMPLATE.SET_PASSWORD]: `${process.env.FE_APP_URL}/set-password?context=SP&credential=${authToken}`,
    [EMAIL_TEMPLATE.RESET_PASSWORD]: `${process.env.FE_APP_URL}/reset-password?context=RP&credential=${authToken}`,
    [EMAIL_TEMPLATE.INVITATION]: `${process.env.FE_APP_URL}`,
  };
  return functionMap[template];
};

export const emailBuilder = (emailDetails: {
  userName: string;
  emailId: string;
  template: EMAIL_TEMPLATE;
  hasOtp?: boolean;
  otp?: string;
  hasAuthToken?: boolean;
  httpLink: {
    credential?: string | null;
  };
}) => {
  const {
    userName,
    emailId,
    template,
    hasOtp,
    otp,
    // hasAuthToken,
    httpLink: { credential },
  } = emailDetails;
  const templateFn = EMAIL_TEMPLATES[template];
  if (!templateFn) {
    throw new AppError(`No template found for ${template}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  if (template === EMAIL_TEMPLATE.RESET_PASSWORD || template === EMAIL_TEMPLATE.SET_PASSWORD) {
    if (!credential) {
      throw new AppError(`No email token found for ${template}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  const httpLink = hasOtp ? (otp as string) : getHttpLink(template, credential ?? null);

  const htmlBody = templateFn({ key1: userName, key2: httpLink });
  console.log(emailId);
  // NOTE: This is a test ToAddresses email, please remove this in production
  return {
    Destination: {
      // ToAddresses: [emailId],
      ToAddresses: ['lumifi@kazisu.com'],
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: mapEmailSubject(template),
      },
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: htmlBody,
        },
      },
    },
    Source: process.env.AWS_SES_SENDER_EMAIL,
  };
};
