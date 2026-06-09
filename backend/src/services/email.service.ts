import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "../config/env";

// Create reusable transporter.
// family: 4 forces IPv4 — required on Render free tier which blocks outbound IPv6.
// Timeouts prevent SMTP failures from leaving HTTP responses open (which caused 404s).
const transportOptions: SMTPTransport.Options & { family?: number } = {
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_PORT === 465, // true for port 465, false for 587 (STARTTLS)
    family: 4,                      // force IPv4 — critical on Render free tier
    connectionTimeout: 10_000,      // 10 s to establish TCP connection
    greetingTimeout: 10_000,        // 10 s for SMTP EHLO/HELO greeting
    socketTimeout: 30_000,          // 30 s idle socket timeout
    auth:
        env.EMAIL_USER && env.EMAIL_PASS
            ? { user: env.EMAIL_USER, pass: env.EMAIL_PASS }
            : undefined,
};

const transporter = nodemailer.createTransport(transportOptions);

/**
 * Send a password reset email with a branded HTML template.
 * @param to       Recipient email address
 * @param resetUrl Full URL with the reset token as a query param
 */
export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
    const expiryMinutes = 60;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password – VehicleBook</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;margin-bottom:12px;">
                <span style="font-size:28px;">🚗</span>
              </div>
              <div style="font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.5px;">VehicleBook</div>
              <div style="font-size:13px;color:#64748b;margin-top:2px;">Vehicle Shop Management System</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1e2130;border:1px solid #2d3148;border-radius:16px;padding:40px 36px;">
              <!-- Icon -->
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;background:rgba(99,102,241,0.15);border-radius:50%;padding:16px;">
                  <span style="font-size:36px;">🔑</span>
                </div>
              </div>

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f1f5f9;text-align:center;">
                Reset Your Password
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#94a3b8;text-align:center;line-height:1.6;">
                We received a request to reset your VehicleBook password.<br/>
                Click the button below to set a new password.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                  Reset Password
                </a>
              </div>

              <!-- Expiry Notice -->
              <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:8px;padding:12px 16px;margin-bottom:28px;text-align:center;">
                <span style="font-size:13px;color:#fbbf24;">⏱ This link expires in ${expiryMinutes} minutes</span>
              </div>

              <!-- Fallback URL -->
              <p style="font-size:12px;color:#64748b;margin:0 0 8px;">
                If the button doesn't work, paste this link in your browser:
              </p>
              <p style="font-size:11px;word-break:break-all;color:#6366f1;margin:0 0 28px;">
                ${resetUrl}
              </p>

              <!-- Security Notice -->
              <div style="border-top:1px solid #2d3148;padding-top:20px;">
                <p style="font-size:12px;color:#64748b;margin:0;text-align:center;line-height:1.6;">
                  If you didn't request a password reset, you can safely ignore this email.<br/>
                  Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="font-size:12px;color:#374151;margin:0;">
                © ${new Date().getFullYear()} VehicleBook — Secure Vehicle Shop Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: "Reset Your VehicleBook Password",
        html,
        text: `Reset your VehicleBook password by visiting this link (expires in ${expiryMinutes} minutes):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    });
};
