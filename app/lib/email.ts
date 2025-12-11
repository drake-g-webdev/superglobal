import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend's test domain if no custom domain is set
const FROM_EMAIL = process.env.EMAIL_FROM || 'Superglobal Travel <onboarding@resend.dev>';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email send');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return false;
    }

    console.log('[Email] Message sent:', data?.id);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return false;
  }
}

// Welcome email template
export function getWelcomeEmailHtml(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Superglobal Travel</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1c1917;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #292524; border-radius: 16px; border: 1px solid #44403c;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: monospace;">
                superglobal.travel
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #ea580c;">
                Powered by The Broke Backpacker
              </p>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; color: #ffffff;">
                Welcome, ${name}! Thanks for taking the time to test our site.
              </h2>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #d6d3d1;">
                superglobal is still in the very early stages of development. Please send me an email (drake@superglobal.travel) to detail your experience and what walls you find yourself running into. There are many issues which I am working on fixing, and many which I am not yet aware of -- your feedback is greatly appreciated. 
              </p>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 16px; background-color: #1c1917; border-radius: 8px; margin-bottom: 8px;">
                    <p style="margin: 0; font-size: 14px; color: #d6d3d1;">
                      <span style="color: #ea580c; font-weight: bold;">🗺️ Interactive Maps</span> - Pin locations and plan routes visually
                    </p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #1c1917; border-radius: 8px;">
                    <p style="margin: 0; font-size: 14px; color: #d6d3d1;">
                      <span style="color: #ea580c; font-weight: bold;">💰 Budget Tracking</span> - Keep your trip costs under control
                    </p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #1c1917; border-radius: 8px;">
                    <p style="margin: 0; font-size: 14px; color: #d6d3d1;">
                      <span style="color: #ea580c; font-weight: bold;">📋 Smart Itineraries</span> - AI-generated day-by-day plans
                    </p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #1c1917; border-radius: 8px;">
                    <p style="margin: 0; font-size: 14px; color: #d6d3d1;">
                      <span style="color: #ea580c; font-weight: bold;">🎒 Packing Lists</span> - Never forget essentials again
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 20px 40px 40px;">
              <a href="https://superglobal.travel/app" style="display: inline-block; padding: 16px 32px; background-color: #ea580c; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
                Start Planning Your Adventure
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #44403c;">
              <p style="margin: 0; font-size: 12px; color: #78716c; text-align: center;">
                This email was sent because you signed up for superglobal.travel.<br>
                If you didn't create this account, please ignore this email.
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #78716c; text-align: center;">
                Powered by <a href="https://www.thebrokebackpacker.com" style="color: #ea580c; text-decoration: none;">The Broke Backpacker</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Welcome to Superglobal Travel, ${name}! 🎒`,
    html: getWelcomeEmailHtml(name),
  });
}
