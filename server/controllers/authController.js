const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  cookieOptions,
} = require("../middleware/tokens");

function setAuthCookies(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return accessToken;
}

async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email, and password are all required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: "That email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash });

    setAuthCookies(res, user);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    setAuthCookies(res, user);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  res.json({ message: "Logged out." });
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token." });

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "User no longer exists." });

    const accessToken = signAccessToken(user);
    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.json({ message: "Token refreshed." });
  } catch (err) {
    return res.status(401).json({ error: "Refresh token expired or invalid. Please log in again." });
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, refresh, me };
