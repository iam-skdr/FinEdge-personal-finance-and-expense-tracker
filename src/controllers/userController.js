const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { UnauthorizedError } = require("../utils/errors");

// Register new user
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const user = await User.create({ username, email, password });
  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user,
      token,
    },
  });
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new UnauthorizedError("Email and password are required");
  }

  const user = await User.authenticate(email, password);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = generateToken(user.id);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user,
      token,
    },
  });
});

// Get user profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    success: true,
    data: { user },
  });
});

// Update user preferences
const updatePreferences = asyncHandler(async (req, res) => {
  const { preferences } = req.body;

  if (!preferences || typeof preferences !== "object") {
    throw new ValidationError("Preferences object is required");
  }

  const user = await User.updatePreferences(req.user.id, preferences);

  res.json({
    success: true,
    message: "Preferences updated successfully",
    data: { user },
  });
});

// Get user by username (public endpoint)
const getUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findByUsername(username);

  if (!user) {
    throw new NotFoundError("User");
  }

  res.json({
    success: true,
    data: { user },
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updatePreferences,
  getUserByUsername,
};
