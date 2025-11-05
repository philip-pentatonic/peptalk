/**
 * Email service using Resend
 * Sends magic link authentication emails
 */

import { Resend } from 'resend'

export interface EmailConfig {
  apiKey: string
  from: string
}

export interface MagicLinkEmail {
  to: string
  token: string
  baseUrl: string
}

/**
 * Initialize Resend client
 */
export function initResend(apiKey: string): Resend {
  return new Resend(apiKey)
}

/**
 * Send magic link email
 */
export async function sendMagicLink(
  resend: Resend,
  config: MagicLinkEmail,
  from: string
): Promise<{ id: string }> {
  const magicLink = `${config.baseUrl}/auth/verify?token=${config.token}`

  const { data, error } = await resend.emails.send({
    from,
    to: config.to,
    subject: 'Sign in to PepTalk',
    html: buildMagicLinkHtml(magicLink),
    text: buildMagicLinkText(magicLink),
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return { id: data!.id }
}

/**
 * Build HTML email template
 */
function buildMagicLinkHtml(magicLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to PepTalk</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">PepTalk</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Evidence-Based Peptide Reference</p>
  </div>

  <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin-top: 0; color: #111827;">Sign in to your account</h2>

    <p style="color: #6b7280; margin-bottom: 30px;">
      Click the button below to sign in to PepTalk. This link will expire in 15 minutes.
    </p>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Sign In to PepTalk
      </a>
    </div>

    <p style="color: #9ca3af; font-size: 14px; margin-top: 40px;">
      If you didn't request this email, you can safely ignore it.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      PepTalk - Citation-First Peptide Reference<br>
      For educational purposes only. Not medical advice.
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Build plain text email
 */
function buildMagicLinkText(magicLink: string): string {
  return `
Sign in to PepTalk

Click the link below to sign in to your account. This link will expire in 15 minutes.

${magicLink}

If you didn't request this email, you can safely ignore it.

---
PepTalk - Citation-First Peptide Reference
For educational purposes only. Not medical advice.
  `.trim()
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmation(
  resend: Resend,
  to: string,
  from: string
): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'Welcome to PepTalk Premium',
    html: buildSubscriptionHtml(),
    text: buildSubscriptionText(),
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return { id: data!.id }
}

function buildSubscriptionHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to PepTalk Premium</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #667eea;">Welcome to PepTalk Premium!</h1>

  <p>Thank you for subscribing to PepTalk Premium. You now have unlimited access to:</p>

  <ul>
    <li>Complete peptide research pages</li>
    <li>PDF downloads</li>
    <li>Regular updates with new studies</li>
    <li>Full citation access</li>
  </ul>

  <p>
    <a href="https://peptalk.com/peptides" style="color: #667eea;">Browse Peptides →</a>
  </p>

  <p style="color: #666; font-size: 14px; margin-top: 40px;">
    Questions? Reply to this email or visit our help center.
  </p>
</body>
</html>
  `.trim()
}

function buildSubscriptionText(): string {
  return `
Welcome to PepTalk Premium!

Thank you for subscribing. You now have unlimited access to complete peptide research pages, PDF downloads, and regular updates.

Browse peptides: https://peptalk.com/peptides

Questions? Reply to this email.
  `.trim()
}
