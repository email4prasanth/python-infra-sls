export const deactivationAccountTemplate = (emailId: string) => {
  return `
    <p>Hello ${emailId},</p>
    <p>Your account has been deactivated.</p>
    <p>Thank you for using Lumifi.</p>
  `;
};
