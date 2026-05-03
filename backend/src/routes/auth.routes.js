const express = require("express");
const {
  registerUser,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  verifyEmail
} = require("../services/auth.service");

const env = require("../config/env");
const {
  getSessionCookieOptions,
  getClearSessionCookieOptions,
  getUserFromRequest
} = require("../services/session.service");
const {
  startLoginWithCode,
  verifyLoginCode,
  getLoginChallengeCookieOptions,
  getClearLoginChallengeCookieOptions,
  getRememberDeviceCookieOptions,
  getClearRememberDeviceCookieOptions
} = require("../services/two-factor-login.service");
const router = express.Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const result = await startLoginWithCode({
      email,
      password,
      rememberDeviceToken: req.cookies?.[env.rememberDeviceCookieName]
    });

    if (result.bypassCode) {
      res.cookie(env.sessionCookieName, result.sessionToken, getSessionCookieOptions());

      return res.status(200).json({
        message: "Login successful",
        requiresCode: false,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username
        }
      });
    }

    res.cookie(env.loginCodeCookieName, result.challengeToken, getLoginChallengeCookieOptions());

    return res.status(200).json({
      message: "Login code sent. Please check your email.",
      requiresCode: true
    });
  } catch (error) {
    if (error.message === "Email not verified") {
      return res.status(403).json({
        message: "Please verify your email before logging in."
      });
    }

    return res.status(401).json({
      message: "Invalid credentials"
    });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    if (!username || !email || !phone || !password) {
      return res.status(400).json({
        message: "Username, email, phone and password are required"
      });
    }

    const user = await registerUser({
      username,
      email,
      phone,
      password
    });

    return res.status(201).json({
      message: "Account created. Please verify your email before logging in.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone
      }
    });
  } catch (error) {
    if (error.message === "Email already in use") {
      return res.status(409).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Registration failed"
    });
  }
});

router.post("/auth/resend-verification-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    await resendVerificationEmail(email);

    return res.status(200).json({
      message: "Verification email sent. Please check your inbox."
    });
  } catch (error) {
    if (error.message === "Email already verified") {
      return res.status(409).json({
        message: "Email is already verified."
      });
    }

    return res.status(200).json({
      message: "If this email exists, a verification email has been sent."
    });
  }
});

router.get("/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        message: "Verification token is required"
      });
    }

    await verifyEmail(token);

    return res.status(200).json({
      message: "Email verified successfully"
    });
  } catch (_error) {
    return res.status(400).json({
      message: "Invalid or expired verification token"
    });
  }
});

router.get("/auth/me", async (req, res) => {
  const user = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({
      message: "Not authenticated"
    });
  }

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone
    }
  });
});
router.post("/auth/logout", (_req, res) => {
  res.clearCookie(env.sessionCookieName, getClearSessionCookieOptions());
  res.clearCookie(env.loginCodeCookieName, getClearLoginChallengeCookieOptions());
  res.clearCookie(env.rememberDeviceCookieName, getClearRememberDeviceCookieOptions());
  return res.status(200).json({
    message: "Logged out"
  });
});
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    await requestPasswordReset(email);

    return res.status(200).json({
      message: "If this email exists, a password reset link has been sent."
    });
  } catch (_error) {
    return res.status(200).json({
      message: "If this email exists, a password reset link has been sent."
    });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: "Token and password are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    await resetPassword({
      token,
      password
    });

    return res.status(200).json({
      message: "Password reset successfully. You can now log in."
    });
  } catch (_error) {
    return res.status(400).json({
      message: "Invalid or expired reset link"
    });
  }
});

router.post("/auth/verify-login-code", async (req, res) => {
  try {
    const { code, rememberDevice } = req.body;
    const challengeToken = req.cookies?.[env.loginCodeCookieName];

    if (!challengeToken || !code) {
      return res.status(400).json({
        message: "Login code is required"
      });
    }

    const result = await verifyLoginCode({
      challengeToken,
      code,
      rememberDevice: Boolean(rememberDevice),
      userAgent: req.get("user-agent")
    });

    res.clearCookie(env.loginCodeCookieName, getClearLoginChallengeCookieOptions());

    res.cookie(env.sessionCookieName, result.sessionToken, getSessionCookieOptions());

    if (result.rememberDeviceToken) {
      res.cookie(
        env.rememberDeviceCookieName,
        result.rememberDeviceToken,
        getRememberDeviceCookieOptions()
      );
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username
      }
    });
  } catch (_error) {
    return res.status(401).json({
      message: "Invalid or expired login code"
    });
  }
});

module.exports = router;
