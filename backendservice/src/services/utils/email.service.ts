import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from '../../lib/connections';
import { AppError } from '../../lib/error';
import { generateEmailToken } from '../../lib/utils';
import { EMAIL_TEMPLATE, emailBuilder } from '../../lib/utils/email-builder';

export const sendEmailNotification = async (emailDetails: {
  userId: string;
  practiceId: string;
  userName: string;
  email: string;
  role: string;
  template: EMAIL_TEMPLATE;
  hasOtp?: boolean;
  otp?: string;
}) => {
  let authToken;
  try {
    const { userId, practiceId, email, role, template, userName, hasOtp, otp } = emailDetails;

    const hasAuthToken = template === EMAIL_TEMPLATE.RESET_PASSWORD || template === EMAIL_TEMPLATE.SET_PASSWORD;
    if (hasAuthToken) {
      authToken = generateEmailToken({
        userId,
        practiceId,
        email,
        role,
        hasExpiry: template === EMAIL_TEMPLATE.RESET_PASSWORD ? true : false, // generate token with expiry for reset password
      });
    }

    const emailContent = emailBuilder({
      userName,
      emailId: email,
      template,
      hasOtp,
      otp,
      hasAuthToken,
      httpLink: {
        credential: authToken,
      },
    });

    const command = new SendEmailCommand(emailContent);
    // console.log(JSON.stringify(command));
    await sesClient.send(command);

    return true;
  } catch (err) {
    throw err as AppError;
  }
};
