const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../utils/errors");
const User = require("../models/User");

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      throw new UnauthorizedError("Access token is required");
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details (excluding password)
    const user = await User.findById(decoded.userId);

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      next(new UnauthorizedError("Invalid access token"));
    } else if (error.name === "TokenExpiredError") {
      next(new UnauthorizedError("Access token has expired"));
    } else {
      next(error);
    }
  }
};

// Optional authentication middleware (for routes that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      req.user = user;
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Refresh token middleware
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token is required");
    }

    // In a production app, you'd store refresh tokens in a database
    // For this demo, we'll just verify the token and issue a new one
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    const newToken = generateToken(user.id);

    res.json({
      success: true,
      data: {
        token: newToken,
        user,
      },
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      next(new UnauthorizedError("Invalid or expired refresh token"));
    } else {
      next(error);
    }
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  refreshToken,
};
