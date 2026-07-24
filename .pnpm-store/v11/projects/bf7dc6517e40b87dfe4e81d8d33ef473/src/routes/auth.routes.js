const express = require("express");
const argon2 = require("argon2");
const {
  registerUser,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  verifyEmail
} = require("../services/auth.service");
const {
  getSessionCookieOptions,
  getRefreshCookieOptions,
  getClearSessionCookieOptions,
  getClearRefreshCookieOptions,
  rotateRefreshToken,
  revokeRefreshToken
} = require("../services/session.service");
const { authRateLimit, strictAuthRateLimit } = require("../middlewares/rate-limit.middleware");
const { authRequired } = require("../middlewares/auth-required.middleware");
const userRepository = require("../repositories/user.repository");
const {
  getPasswordConfirmationError,
  getPasswordValidationError
} = require("../utils/password-validation");
const { serializeAuthUser } = require("../utils/serialize-auth-user");
const { isAdminUser } = require("../middlewares/admin-required.middleware");

const env = require("../config/env");

const {
  GoogleOAuthError,
  authenticateGoogleCode,
  getClearGoogleOAuthLinkCookieOptions,
  getClearGoogleOAuthStateCookieOptions,
  getGoogleAuthorizationUrl,
  getGoogleOAuthLinkCookieOptions,
  getGoogleOAuthStateCookieOptions,
  linkGoogleAccountWithPassword
} = require("../services/google-oauth.service");
const {
  startLoginWithCode,
  verifyLoginCode,
  getLoginChallengeCookieOptions,
  getClearLoginChallengeCookieOptions,
  getRememberDeviceCookieOptions
} = require("../services/two-factor-login.service");
const router = express.Router();

function buildAppRedirect(path, searchParams = {}) {
  const url = new URL(path, env.appBaseUrl);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function setAuthCookies(res, result) {
  res.cookie(env.sessionCookieName, result.accessToken, getSessionCookieOptions());
  res.cookie(env.refreshCookieName, result.refreshToken, getRefreshCookieOptions());
}

function getAuthenticatedAppPath(user) {
  return isAdminUser(user) ? "/admin" : "/";
}

router.post("/auth/login", strictAuthRateLimit, async (req, res) => {
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
      setAuthCookies(res, result);

      if (result.rememberDeviceToken) {
        res.cookie(
          env.rememberDeviceCookieName,
          result.rememberDeviceToken,
          getRememberDeviceCookieOptions()
        );
      }

      return res.status(200).json({
        message: "Login successful",
        requiresCode: false,
        redirectTo: getAuthenticatedAppPath(result.user),
        user: serializeAuthUser(result.user)
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

router.get("/auth/google", authRateLimit, (req, res) => {
  try {
    const { authorizationUrl, state } = getGoogleAuthorizationUrl();

    res.cookie(env.googleOAuth.stateCookieName, state, getGoogleOAuthStateCookieOptions());

    return res.redirect(authorizationUrl);
  } catch (_error) {
    return res.redirect(buildAppRedirect("/login", { google: "unavailable" }));
  }
});

router.get("/auth/google/callback", authRateLimit, async (req, res) => {
  const { code, error, state } = req.query;
  const stateCookie = req.cookies?.[env.googleOAuth.stateCookieName];

  res.clearCookie(env.googleOAuth.stateCookieName, getClearGoogleOAuthStateCookieOptions());

  if (error) {
    return res.redirect(
      buildAppRedirect("/login", {
        google: error === "access_denied" ? "cancelled" : "error"
      })
    );
  }

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return res.redirect(buildAppRedirect("/login", { google: "error" }));
  }

  try {
    const result = await authenticateGoogleCode(String(code));

    if (result.status === "requires_password") {
      res.cookie(
        env.googleOAuth.linkCookieName,
        result.linkToken,
        getGoogleOAuthLinkCookieOptions()
      );

      return res.redirect(
        buildAppRedirect("/login", {
          googleLink: "required",
          email: result.email
        })
      );
    }

    setAuthCookies(res, result);
    res.clearCookie(env.googleOAuth.linkCookieName, getClearGoogleOAuthLinkCookieOptions());

    return res.redirect(buildAppRedirect(getAuthenticatedAppPath(result.user)));
  } catch (_error) {
    return res.redirect(buildAppRedirect("/login", { google: "error" }));
  }
});

router.post("/auth/google/link", authRateLimit, async (req, res) => {
  try {
    const { password } = req.body;
    const linkToken = req.cookies?.[env.googleOAuth.linkCookieName];

    if (!password || !linkToken) {
      return res.status(400).json({
        message: "Google sign-in session and password are required"
      });
    }

    const result = await linkGoogleAccountWithPassword({
      linkToken,
      password
    });

    setAuthCookies(res, result);
    res.clearCookie(env.googleOAuth.linkCookieName, getClearGoogleOAuthLinkCookieOptions());

    return res.status(200).json({
      message: "Google account linked successfully",
      redirectTo: getAuthenticatedAppPath(result.user),
      user: serializeAuthUser(result.user)
    });
  } catch (error) {
    if (error instanceof GoogleOAuthError && error.code === "GOOGLE_LINK_INVALID_PASSWORD") {
      return res.status(401).json({
        message: "Password is incorrect"
      });
    }

    return res.status(400).json({
      message: "Unable to complete Google sign-in"
    });
  }
});

router.post("/auth/register", authRateLimit, async (req, res) => {
  try {
    const { username, email, phone, password, confirmPassword } = req.body;

    if (!username || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Username, email, phone, password and confirmation are required"
      });
    }

    const passwordError =
      getPasswordValidationError(password) ||
      getPasswordConfirmationError(password, confirmPassword);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError
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

    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Registration failed",
      error: error.message
    });
  }
});

router.post("/auth/resend-verification-email", authRateLimit, async (req, res) => {
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

router.get("/auth/me", authRequired, async (req, res) => {
  return res.status(200).json({
    user: serializeAuthUser(req.user)
  });
});

router.patch("/auth/me", authRequired, async (req, res) => {
  try {
    const { username, email, bio } = req.body;
    const updates = {};

    if (username !== undefined) {
      updates.username = username;
    }
    if (email !== undefined) {
      updates.email = email.trim().toLowerCase();
    }
    if (bio !== undefined) {
      updates.bio = bio;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No profile fields provided to update"
      });
    }

    const updatedUser = await userRepository.updateUser(req.user.id, updates);

    return res.status(200).json({
      user: serializeAuthUser(updatedUser)
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Email is already in use"
      });
    }

    console.error("Profile update error:", error);
    return res.status(500).json({
      message: "Unable to update profile"
    });
  }
});

router.patch("/auth/password", authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Current password, new password and confirmation are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: getPasswordConfirmationError(newPassword, confirmPassword)
      });
    }

    const passwordError = getPasswordValidationError(newPassword);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "New password must be different from current password"
      });
    }

    const isValid = await argon2.verify(req.user.passwordHash, currentPassword);

    if (!isValid) {
      return res.status(401).json({
        message: "Current password is incorrect"
      });
    }

    const newPasswordHash = await argon2.hash(newPassword);
    await userRepository.updatePassword(req.user.id, newPasswordHash);

    return res.status(200).json({
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Password update error:", error);
    return res.status(500).json({
      message: "Unable to update password"
    });
  }
});

router.post("/auth/logout", async (req, res) => {
  await revokeRefreshToken(req.cookies?.[env.refreshCookieName]);

  res.clearCookie(env.sessionCookieName, getClearSessionCookieOptions());
  res.clearCookie(env.refreshCookieName, getClearRefreshCookieOptions());
  res.clearCookie(env.loginCodeCookieName, getClearLoginChallengeCookieOptions());

  return res.status(200).json({
    message: "Logged out"
  });
});

router.post("/auth/forgot-password", authRateLimit, async (req, res) => {
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
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Token, password and confirmation are required"
      });
    }

    const passwordError =
      getPasswordValidationError(password) ||
      getPasswordConfirmationError(password, confirmPassword);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError
      });
    }

    const result = await resetPassword({
      token,
      password
    });

    return res.status(200).json({
      message: result?.wasInvitation
        ? "Account activated successfully. You can now log in."
        : "Password reset successfully. You can now log in."
    });
  } catch (_error) {
    return res.status(400).json({
      message: "Invalid or expired reset link"
    });
  }
});

router.post("/auth/verify-login-code", strictAuthRateLimit, async (req, res) => {
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

    setAuthCookies(res, result);

    if (result.rememberDeviceToken) {
      res.cookie(
        env.rememberDeviceCookieName,
        result.rememberDeviceToken,
        getRememberDeviceCookieOptions()
      );
    }

    return res.status(200).json({
      message: "Login successful",
      redirectTo: getAuthenticatedAppPath(result.user),
      user: serializeAuthUser(result.user)
    });
  } catch (error) {
    if (env.nodeEnv !== "production") {
      console.error("Login code verification failed:", error);
    }

    return res.status(401).json({
      message: "Invalid or expired login code"
    });
  }
});

router.post("/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies?.[env.refreshCookieName];

  if (!refreshToken) {
    return res.status(401).json({
      message: "Not authenticated"
    });
  }

  const session = await rotateRefreshToken(refreshToken);

  if (!session) {
    res.clearCookie(env.sessionCookieName, getClearSessionCookieOptions());
    res.clearCookie(env.refreshCookieName, getClearRefreshCookieOptions());

    return res.status(401).json({
      message: "Invalid or expired session"
    });
  }

  res.cookie(env.sessionCookieName, session.accessToken, getSessionCookieOptions());
  res.cookie(env.refreshCookieName, session.refreshToken, getRefreshCookieOptions());

  return res.status(200).json({
    message: "Session refreshed"
  });
});

module.exports = router;
