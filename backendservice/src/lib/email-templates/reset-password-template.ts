export const resetPasswordTemplate = ({ key1: userName, key2: httpLink }: { key1: string; key2: string }) => `
<html>
    <head>
        <title>Lumifi Reset Password</title>
    </head>
    <body>
        <h2>Hello ${userName},</h2>
        <p>We received a request to reset your password for your Lumifi account.</p>
        <p>To reset your password, please click the link below:</p>
        ${httpLink ? `<p>Here's your link: ${httpLink}</p>` : ''}
        <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>Thank you for using Lumifi.</p>
    </body>
</html>
`;
