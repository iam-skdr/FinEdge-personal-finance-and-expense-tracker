// Test setup file
const path = require("path");
const fs = require("fs");

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key";
process.env.DATA_PATH = path.join(__dirname, "../test-data");
process.env.CACHE_TTL = "60000"; // 1 minute for tests

// Clean up test data directory before each test suite
if (fs.existsSync(process.env.DATA_PATH)) {
  fs.rmSync(process.env.DATA_PATH, { recursive: true, force: true });
}

// Global teardown to clear any remaining timers and handles
afterAll(async () => {
  // Clear cache to cleanup any timers
  const cacheService = require("../src/services/cacheService");
  cacheService.clear();

  // Clean up test data directory
  if (fs.existsSync(process.env.DATA_PATH)) {
    fs.rmSync(process.env.DATA_PATH, { recursive: true, force: true });
  }

  // Give a small delay to let any pending operations finish
  await new Promise((resolve) => setTimeout(resolve, 100));
});
