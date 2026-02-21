const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom token for user ID
morgan.token("user-id", (req) => {
  return req.user ? req.user.id : "anonymous";
});

// Custom token for request body (be careful with sensitive data)
morgan.token("request-body", (req) => {
  if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
    // Don't log passwords or sensitive data
    const body = { ...req.body };
    delete body.password;
    delete body.token;
    return JSON.stringify(body);
  }
  return "-";
});

// Define custom format
const customFormat =
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms - :request-body';

// Create write stream for log file
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});

// Logging middleware for development
const developmentLogger = morgan("dev");

// Logging middleware for production
const productionLogger = morgan(customFormat, {
  stream: accessLogStream,
  skip: (req, res) => {
    // Skip logging for health check and static assets
    return req.url === "/health" || req.url.startsWith("/static");
  },
});

// Combined logger for all environments
const combinedLogger = morgan("combined", {
  stream: accessLogStream,
  skip: (req, res) => {
    return req.url === "/health";
  },
});

// Request logging middleware with custom logic
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request details
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`,
  );

  // Log request body for POST/PUT/PATCH (excluding sensitive data)
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
    const logBody = { ...req.body };
    delete logBody.password;
    delete logBody.token;
    console.log("Request Body:", JSON.stringify(logBody, null, 2));
  }

  // Track response time
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`,
    );
  });

  next();
};

module.exports = {
  developmentLogger,
  productionLogger,
  combinedLogger,
  requestLogger,
};
