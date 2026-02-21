const express = require("express");
const router = express.Router();
const summaryController = require("../controllers/summaryController");
const { authenticateToken } = require("../middleware/auth");
const {
  validateQueryParams,
  sanitizeInput,
} = require("../middleware/validation");

// Apply authentication and sanitization to all routes
router.use(authenticateToken);
router.use(sanitizeInput);

// Summary routes
router.get("/", validateQueryParams(["month"]), summaryController.getSummary);

router.get(
  "/analytics",
  validateQueryParams(["period", "category", "limit"]),
  summaryController.getAnalytics,
);

router.get(
  "/trends",
  validateQueryParams(["category", "months"]),
  summaryController.getSpendingTrends,
);

module.exports = router;
