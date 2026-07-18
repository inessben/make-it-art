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
    subject: "Verify your ACCOUNT",
    text: [
      `Hi ${displayName},`,
      "",
      "Thanks for creating your ACCOUNT.",
      "Please verify your email address by opening this link:",
      verificationUrl,
      "",
      "This link expires in 1 hour."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #172033;">
        <h1 style="font-size: 22px;">Verify your email</h1>
        <p>Hi ${displayName},</p>
        <p>Thanks for creating your ACCOUNT.</p>
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

async function sendAdminInvitationEmail({ to, username, activationUrl, isSuperAdmin }) {
  const transporter = createTransporter();
  const displayName = username || "there";
  const accessLevel = isSuperAdmin ? "super admin" : "admin";

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: "Your Make It Art admin invitation",
    text: [
      `Hi ${displayName},`,
      "",
      `You have been invited to join Make It Art as a ${accessLevel}.`,
      "Open this link to activate your account and choose your password:",
      activationUrl,
      "",
      "This invitation link expires in 1 hour."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #172033;">
        <h1 style="font-size: 22px;">Activate your admin account</h1>
        <p>Hi ${displayName},</p>
        <p>You have been invited to join Make It Art as a ${accessLevel}.</p>
        <p>
          <a href="${activationUrl}" style="display: inline-block; padding: 10px 14px; background: #172033; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Activate my account
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${activationUrl}">${activationUrl}</a></p>
        <p>This invitation link expires in 1 hour.</p>
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

function buildPaymentConfirmationMessage({ to, username, orderPublicId }) {
  const orderUrl = `${env.appBaseUrl}/orders/${encodeURIComponent(orderPublicId)}`;
  const displayName = username || "collector";
  const safeName = String(displayName)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  return {
    from: env.smtp.from,
    to,
    subject: "Your Make It Art order is confirmed",
    text: [
      `Hello ${displayName},`,
      "Your order has been confirmed after secure verification by our payment provider.",
      `View it after signing in: ${orderUrl}`,
      "This message never contains card or bank details."
    ].join("\n\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h1 style="font-size: 22px;">Order confirmed</h1>
        <p>Hello ${safeName},</p>
        <p>Your order has been confirmed after secure verification by our payment provider.</p>
        <p><a href="${orderUrl}">View your order after signing in</a></p>
        <p>This message never contains card or bank details.</p>
      </div>
    `
  };
}

async function sendPaymentConfirmationEmail(input) {
  const transporter = createTransporter();
  return transporter.sendMail(buildPaymentConfirmationMessage(input));
}

async function sendPaymentOperationsAlert({ code, count }) {
  if (!env.paymentAlertEmail) return null;
  const safeCode = String(code)
    .replace(/[^A-Z0-9_:-]/g, "")
    .slice(0, 120);
  const safeCount = Number.isSafeInteger(count) ? count : 1;
  return createTransporter().sendMail({
    from: env.smtp.from,
    to: env.paymentAlertEmail,
    subject: `[Make It Art payment alert] ${safeCode}`,
    text: `Payment operations alert\nCode: ${safeCode}\nCount: ${safeCount}\nNo bank or card data is included.`
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminInvitationEmail,
  sendLoginCodeEmail,
  buildPaymentConfirmationMessage,
  sendPaymentConfirmationEmail,
  sendPaymentOperationsAlert
};
