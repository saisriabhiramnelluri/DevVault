import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function sendOTPEmail(
  email: string,
  otp: string,
  purpose: 'LOGIN' | 'PASSWORD_RESET'
): Promise<void> {
  const subject =
    purpose === 'LOGIN'
      ? 'Your DevVault Login Code'
      : 'Your DevVault Password Reset Code';

  const actionText =
    purpose === 'LOGIN'
      ? 'complete your login'
      : 'reset your vault password';

  const warningText =
    purpose === 'PASSWORD_RESET'
      ? `<p style="color:#EF4444;margin:16px 0;font-size:14px;"><strong>⚠️ Important:</strong> Resetting your password will clear all previously encrypted secrets (environment variables and account notes), as they were encrypted with your old password. You will need to re-enter them after resetting.</p>`
      : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:#0F172A;padding:24px 32px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:32px;height:32px;background:#38BDF8;border-radius:8px;text-align:center;vertical-align:middle;">
                        <span style="color:#0F172A;font-weight:800;font-size:16px;">D</span>
                      </td>
                      <td style="padding-left:10px;color:#FFFFFF;font-weight:700;font-size:18px;letter-spacing:-0.3px;">DevVault</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">Verification Code</h1>
                  <p style="margin:0 0 24px;color:#64748B;font-size:15px;line-height:1.5;">Use the code below to ${actionText}. This code expires in <strong>${config.otp.expiresMinutes} minutes</strong>.</p>
                  
                  ${warningText}

                  <!-- OTP Code -->
                  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                    <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0F172A;font-family:monospace;">${otp}</span>
                  </div>

                  <p style="margin:0;color:#94A3B8;font-size:13px;line-height:1.6;">
                    This code is single-use and will expire at ${new Date(Date.now() + config.otp.expiresMinutes * 60000).toUTCString()}.
                    If you didn't request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;">
                  <p style="margin:0;color:#94A3B8;font-size:12px;">
                    DevVault — Secure Developer Vault &nbsp;·&nbsp; Do not share this code with anyone.
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

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    html,
  });
}

export async function sendLoginAlertEmail(
  email: string,
  ipAddress: string,
  deviceInfo: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;">
              <tr>
                <td style="background:#0F172A;padding:24px 32px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:32px;height:32px;background:#38BDF8;border-radius:8px;text-align:center;vertical-align:middle;">
                        <span style="color:#0F172A;font-weight:800;font-size:16px;">D</span>
                      </td>
                      <td style="padding-left:10px;color:#FFFFFF;font-weight:700;font-size:18px;">DevVault</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;">New Login Detected</h1>
                  <p style="margin:0 0 24px;color:#64748B;font-size:15px;">Someone just logged into your DevVault account.</p>
                  <table style="width:100%;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;" cellpadding="8">
                    <tr>
                      <td style="color:#64748B;font-size:13px;">IP Address</td>
                      <td style="color:#0F172A;font-size:13px;font-weight:600;">${ipAddress}</td>
                    </tr>
                    <tr>
                      <td style="color:#64748B;font-size:13px;">Device</td>
                      <td style="color:#0F172A;font-size:13px;font-weight:600;">${deviceInfo}</td>
                    </tr>
                    <tr>
                      <td style="color:#64748B;font-size:13px;">Time</td>
                      <td style="color:#0F172A;font-size:13px;font-weight:600;">${new Date().toUTCString()}</td>
                    </tr>
                  </table>
                  <p style="margin:20px 0 0;color:#94A3B8;font-size:13px;">If this wasn't you, please change your password immediately and revoke all active sessions in Settings.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: '🔐 New Login to Your DevVault',
    html,
  });
}
