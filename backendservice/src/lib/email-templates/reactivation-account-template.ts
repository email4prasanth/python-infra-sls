export const reactivationAccountTemplate = (emailId: string) => {
  return `
    <p>Hello ${emailId},</p>
    <p>Your account has been reactivated.</p>
    <p>Thank you for using Lumifi.</p>
  `;
};
