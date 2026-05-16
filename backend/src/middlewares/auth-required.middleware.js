const { getUserFromRequest } = require("../services/session.service");

async function authRequired(req, res, next) {
  const user = await getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({
      message: "Not authenticated"
    });
  }

  req.user = user;
  return next();
}

module.exports = {
  authRequired
};
