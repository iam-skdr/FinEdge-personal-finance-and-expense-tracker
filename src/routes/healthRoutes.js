const express = require("express");
const router = express.Router();

// Health check route
router.get("/health", (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  };

  try {
    res.status(200).json({
      success: true,
      data: healthCheck,
    });
  } catch (error) {
    healthCheck.message = "Server is experiencing issues";
    res.status(503).json({
      success: false,
      error: healthCheck,
    });
  }
});

// API status and information
router.get("/status", (req, res) => {
  const cacheService = require("../services/cacheService");

  const status = {
    server: "running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    cache: {
      size: cacheService.size(),
      stats: cacheService.getStats(),
    },
    memory: {
      used:
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total:
        Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      external:
        Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
    },
    endpoints: {
      health: "/health",
      users: "/api/users",
      transactions: "/api/transactions",
      budgets: "/api/budgets",
      summary: "/api/summary",
    },
  };

  res.json({
    success: true,
    data: status,
  });
});

module.exports = router;
