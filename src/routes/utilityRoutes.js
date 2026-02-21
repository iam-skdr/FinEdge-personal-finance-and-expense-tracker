const express = require("express");
const router = express.Router();
const SampleDataService = require("../services/sampleDataService");
const { authenticateToken } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const cacheService = require("../services/cacheService");

// Generate sample data for authenticated user
router.post(
  "/generate-sample-data",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Sample data generation is not allowed in production",
        },
      });
    }

    const result = await SampleDataService.generateSampleData(req.user.id);

    // Clear user's cache
    const userCacheKeys = cacheService
      .keys()
      .filter((key) => key.includes(req.user.id));
    userCacheKeys.forEach((key) => cacheService.delete(key));

    res.json({
      success: true,
      message: "Sample data generated successfully",
      data: result,
    });
  }),
);

// Clear user data
router.delete(
  "/clear-data",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Data clearing is not allowed in production",
        },
      });
    }

    const result = await SampleDataService.clearUserData(req.user.id);

    // Clear user's cache
    const userCacheKeys = cacheService
      .keys()
      .filter((key) => key.includes(req.user.id));
    userCacheKeys.forEach((key) => cacheService.delete(key));

    res.json({
      success: true,
      message: "User data cleared successfully",
      data: result,
    });
  }),
);

// Cache management routes (for development/testing)
router.get("/cache/stats", (req, res) => {
  const stats = cacheService.getStats();

  res.json({
    success: true,
    data: {
      cache: stats,
      message: "Cache statistics retrieved",
    },
  });
});

router.delete("/cache/clear", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Cache clearing is not allowed in production",
      },
    });
  }

  cacheService.clear();

  res.json({
    success: true,
    message: "Cache cleared successfully",
  });
});

module.exports = router;
