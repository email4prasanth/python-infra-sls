export const invitationTemplate = ({ key1: userName, key2: httpLink }: { key1: string; key2: string }) => `
    <html>
      <head>
          <title>Lumifi Invitation</title>
      </head>
      <body>
          <h2>Hello ${userName},</h2>
          <p>You have been invited to join Lumifi. Please click the link below to login</p>
          ${httpLink ? `<p>Here's your link: ${httpLink}</p>` : ''}
          <p>Thank you for using Lumifi.</p>
      </body>
    </html>
  `;
