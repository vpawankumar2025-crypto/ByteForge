// Generic SMTP mailer. Works with Gmail (app password), Resend, Brevo,
// or any other SMTP provider — just fill in the matching values in .env.
//
// Gmail:   host=smtp.gmail.com   port=587   user=you@gmail.com   pass=<16-char app password>
// Resend:  host=smtp.resend.com  port=587   user=resend          pass=<your Resend API key>
// Brevo:   host=smtp-relay.brevo.com  port=587  user=<your Brevo login>  pass=<your Brevo SMTP key>

const nodemailer = require('nodemailer');

const emailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Send an email, optionally with PDF attachments.
 * @param {{to:string, subject:string, html:string, attachments?:Array}} opts
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
  if (!emailConfigured) {
    console.log(`[mailer] Email not configured — skipped sending "${subject}" to ${to}`);
    return { sent: false, reason: 'Email not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env' };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      attachments,
    });
    return { sent: true };
  } catch (e) {
    console.error('[mailer] Failed to send email:', e.message);
    return { sent: false, reason: e.message };
  }
}

module.exports = { sendEmail, emailConfigured };
