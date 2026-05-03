const nodemailer = require("nodemailer");
const env = require("../config/env");

function createTransporter() {
  if (!env.smtp.host) {
    throw new Error("SMTP_HOST is required to send emails");
  }

  const transportConfig = {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure
  };

  if (env.smtp.user || env.smtp.pass) {
    transportConfig.auth = {
      user: env.smtp.user,
      pass: env.smtp.pass
    };
  }

  return nodemailer.createTransport(transportConfig);
}

async function sendVerificationEmail({ to, username, verificationUrl }) {
  const transporter = createTransporter();
  const displayName = username || "there";

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: "Verify your Make It Art account",
    text: [
      `Hi ${displayName},`,
      "",
      "Thanks for creating your Make It Art account.",
      "Please verify your email address by opening this link:",
      verificationUrl,
      "",
      "This link expires in 1 hour."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #172033;">
        <h1 style="font-size: 22px;">Verify your email</h1>
        <p>Hi ${displayName},</p>
        <p>Thanks for creating your Make It Art account.</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 14px; background: #172033; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Verify my email
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link expires in 1 hour.</p>
      </div>
    `
  });
}
async function sendPasswordResetEmail({ to, username, resetUrl }) {
  const transporter = createTransporter();
  const displayName = username || "there";

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: "Reset your Make It Art password",
    text: [
      `Hi ${displayName},`,
      "",
      "We received a request to reset your Make It Art password.",
      "Open this link to choose a new password:",
      resetUrl,
      "",
      "This link expires in 1 hour.",
      "If you did not request this, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #172033;">
        <h1 style="font-size: 22px;">Reset your password</h1>
        <p>Hi ${displayName},</p>
        <p>We received a request to reset your Make It Art password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 14px; background: #172033; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Reset my password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `
  });
}
async function sendLoginCodeEmail({ to, username, code }) {
  const transporter = createTransporter();
  const displayName = username || "there";

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: "Your Make It Art login code",
    text: [
      `Hi ${displayName},`,
      "",
      "Use this code to finish signing in:",
      code,
      "",
      "This code expires in 10 minutes.",
      "If you did not try to sign in, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #172033;">
        <h1 style="font-size: 22px;">Your login code</h1>
        <p>Hi ${displayName},</p>
        <p>Use this code to finish signing in:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not try to sign in, you can ignore this email.</p>
      </div>
    `
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginCodeEmail
};
