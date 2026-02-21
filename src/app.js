require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import middleware
const {
  developmentLogger,
  productionLogger,
  requestLogger,
} = require("./middleware/logger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// Import routes
const healthRoutes = require("./routes/healthRoutes");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const summaryRoutes = require("./routes/summaryRoutes");
const utilityRoutes = require("./routes/utilityRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again later.",
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(developmentLogger);
} else {
  app.use(productionLogger);
}

// Custom request logging
if (process.env.NODE_ENV === "development") {
  app.use(requestLogger);
}

// Health check route (no rate limiting)
app.use("/", healthRoutes);

// API routes
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/utils", utilityRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Personal Finance Management API",
    version: "1.0.0",
    documentation: {
      health: "/health",
      status: "/status",
      endpoints: {
        users: "/api/users",
        transactions: "/api/transactions",
        budgets: "/api/budgets",
        summary: "/api/summary",
      },
    },
    features: [
      "User Authentication & JWT",
      "Transaction Management",
      "Budget Planning & Analysis",
      "Financial Analytics & Reporting",
      "Auto-categorization",
      "Caching with TTL",
      "Rate Limiting",
      "Input Validation & Sanitization",
      "Error Handling",
      "Request Logging",
    ],
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🚀 Personal Finance Management API
📊 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
📝 Health check: http://localhost:${PORT}/health
📖 API Documentation: http://localhost:${PORT}/
    `);
});

module.exports = app;
