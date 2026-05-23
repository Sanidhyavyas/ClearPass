/**
 * middleware/rateLimiter.js
 *
 * Rate limiting middleware using express-rate-limit.
 *
 * authLimiter       — strict: 10 requests / 15 min — applied to /api/auth
 * apiLimiter        — relaxed: 200 requests / 15 min — applied globally
 * uploadLimiter     — restrictive: 20 requests / 15 min — applied to upload endpoints
 * superAdminLimiter — very strict: 5 requests / 15 min — applied to super-admin login
 */

const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  // Skip rate limiting in test environments
  skip: () => process.env.NODE_ENV === "test",
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please slow down.",
  },
  skip: () => process.env.NODE_ENV === "test",
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many upload requests. Please try again after 15 minutes.",
  },
  skip: () => process.env.NODE_ENV === "test",
});

const superAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many super-admin login attempts. Please try again after 15 minutes.",
  },
  skip: () => process.env.NODE_ENV === "test",
});

module.exports = { authLimiter, apiLimiter, uploadLimiter, superAdminLimiter };
