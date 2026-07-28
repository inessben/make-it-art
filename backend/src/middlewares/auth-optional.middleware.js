const { getUserFromRequest } = require("../services/session.service");

async function authOptional(req, _res, next) {
  try {
    const user = await getUserFromRequest(req);
    if (user) {
      req.user = user;
    }
  } catch (_error) {
    // Anonymous continues.
  }
  return next();
}

module.exports = {
  authOptional
};
