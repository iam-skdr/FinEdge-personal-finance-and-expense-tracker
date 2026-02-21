const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken, refreshToken } = require("../middleware/auth");
const {
  validateUserRegistration,
  sanitizeInput,
} = require("../middleware/validation");

// Apply sanitization to all routes
router.use(sanitizeInput);

// Public routes
router.post("/register", validateUserRegistration, userController.register);
router.post("/login", userController.login);
router.post("/refresh-token", refreshToken);
router.get("/username/:username", userController.getUserByUsername);

// Protected routes
router.use(authenticateToken);
router.get("/profile", userController.getProfile);
router.patch("/preferences", userController.updatePreferences);

module.exports = router;
