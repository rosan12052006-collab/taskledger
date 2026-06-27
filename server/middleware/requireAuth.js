const { verifyAccessToken } = require("./tokens");

/**
 * Reads the access token from either the httpOnly cookie or an
 * Authorization: Bearer header (handy for mobile clients / Postman),
 * verifies it, and attaches req.userId for downstream handlers.
 */
function requireAuth(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
    const token = req.cookies?.accessToken || bearer;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

module.exports = requireAuth;
