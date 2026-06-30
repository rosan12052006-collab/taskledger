const express = require("express");
const rateLimit = require("express-rate-limit");
const { signup, login, logout, refresh, me } = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Slow down brute-force attempts on auth endpoints specifically
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);

// TEMPORARY DEBUG ROUTE — lists registered emails (no passwords) to diagnose
// "already registered" confusion. Remove this before finishing the project.
router.get("/_debug/list-emails", async (req, res, next) => {
  try {
    const User = require("../models/User");
    const users = await User.find({}, "email createdAt").sort({ createdAt: -1 }).limit(50);
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
