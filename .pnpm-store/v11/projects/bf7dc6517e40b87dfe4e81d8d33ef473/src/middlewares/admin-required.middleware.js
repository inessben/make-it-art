function isAdminUser(user) {
  return user?.role === "admin" || Boolean(user?.admin);
}

function isSuperAdminUser(user) {
  return isAdminUser(user) && user?.admin?.isSuperAdmin === true;
}

function adminRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Not authenticated"
    });
  }

  if (!isAdminUser(req.user)) {
    return res.status(403).json({
      message: "Admin access required"
    });
  }

  return next();
}

function superAdminRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Not authenticated"
    });
  }

  if (!isSuperAdminUser(req.user)) {
    return res.status(403).json({
      message: "Super admin access required"
    });
  }

  return next();
}

module.exports = {
  adminRequired,
  superAdminRequired,
  isAdminUser,
  isSuperAdminUser
};
