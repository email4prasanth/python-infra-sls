export const setPasswordTemplate = ({ key1: userName, key2: httpLink }: { key1: string; key2: string }) => `

<html>
    <head>
        <title>Lumifi Account Verification</title>
    </head>
    <body>
        <h2>Hello ${userName},</h2>
        <p>You have been invited to join Lumifi. Please verify your account by clicking the link below:</p>
        ${httpLink ? `<p>Here's your link: ${httpLink}</p>` : ''}
        <p>Thank you for using Lumifi.</p>
    </body>
</html>
`;
