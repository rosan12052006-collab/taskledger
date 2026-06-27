const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// In production (deployed), frontend and backend are on different domains
// (e.g. Vercel + Render), so cookies need sameSite: "none" + secure: true to
// be sent cross-site at all. Locally, both run on localhost, so "lax" is fine
// and doesn't require HTTPS.
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  cookieOptions,
};
