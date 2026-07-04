function isAdminUser(user) {
  return user?.role === "admin" || Boolean(user?.admin);
}

function adminRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  if (!isAdminUser(req.user)) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  return next();
}

module.exports = {
  adminRequired,
  isAdminUser,
};
