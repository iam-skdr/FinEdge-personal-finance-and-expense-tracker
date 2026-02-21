const request = require("supertest");
const app = require("../src/app");
const fileService = require("../src/services/fileService");
const cacheService = require("../src/services/cacheService");

// Global cleanup after all tests
afterAll(async () => {
  // Clear cache to cleanup timers
  cacheService.clear();
  
  // Clean up any remaining test files
  try {
    await fileService.writeFile("users", []);
    await fileService.writeFile("transactions", []);
    await fileService.writeFile("budgets", []);
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Give a moment for any async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

describe("Health Routes", () => {
  test("GET /health should return server status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("uptime");
    expect(response.body.data).toHaveProperty("message", "Server is running");
    expect(response.body.data).toHaveProperty("timestamp");
  });

  test("GET /status should return detailed status", async () => {
    const response = await request(app).get("/status").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("server", "running");
    expect(response.body.data).toHaveProperty("cache");
    expect(response.body.data).toHaveProperty("memory");
    expect(response.body.data).toHaveProperty("endpoints");
  });
});

describe("User Authentication", () => {
  beforeEach(async () => {
    // Clean up users file before each test
    await fileService.writeFile("users", []);
  });

  afterEach(async () => {
    // Clear cache after each test
    cacheService.clear();
  });

  test("POST /api/users/register should create a new user", async () => {
    const userData = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    };

    const response = await request(app)
      .post("/api/users/register")
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toHaveProperty("username", "testuser");
    expect(response.body.data.user).toHaveProperty("email", "test@example.com");
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data).toHaveProperty("token");
  });

  test("POST /api/users/login should authenticate user", async () => {
    // First create a user
    await request(app).post("/api/users/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });

    // Then login
    const response = await request(app)
      .post("/api/users/login")
      .send({
        email: "test@example.com",
        password: "password123",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("token");
    expect(response.body.data.user).toHaveProperty("email", "test@example.com");
  });

  test("POST /api/users/login should reject invalid credentials", async () => {
    const response = await request(app)
      .post("/api/users/login")
      .send({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("Transaction Management", () => {
  let authToken;

  beforeEach(async () => {
    // Clean up data files
    await fileService.writeFile("users", []);
    await fileService.writeFile("transactions", []);

    // Create and authenticate user
    const registerResponse = await request(app)
      .post("/api/users/register")
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

    authToken = registerResponse.body.data.token;
  });

  afterEach(async () => {
    // Clear cache after each test
    cacheService.clear();
  });

  test("POST /api/transactions should create a transaction", async () => {
    const transactionData = {
      type: "expense",
      category: "Food & Dining",
      amount: 25.5,
      description: "Lunch at restaurant",
    };

    const response = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send(transactionData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.transaction).toHaveProperty("type", "expense");
    expect(response.body.data.transaction).toHaveProperty("amount", 25.5);
    expect(response.body.data.transaction).toHaveProperty("id");
  });

  test("GET /api/transactions should return user transactions", async () => {
    // Create a transaction first
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "income",
        category: "Salary",
        amount: 1000,
        description: "Monthly salary",
      });

    const response = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.transactions).toHaveLength(1);
    expect(response.body.data.pagination).toHaveProperty("totalItems", 1);
  });

  test("POST /api/transactions should validate required fields", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "expense",
        // Missing category and amount
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("Summary Endpoints", () => {
  let authToken;

  beforeEach(async () => {
    // Clean up and setup
    await fileService.writeFile("users", []);
    await fileService.writeFile("transactions", []);

    const registerResponse = await request(app)
      .post("/api/users/register")
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

    authToken = registerResponse.body.data.token;

    // Create sample transactions
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "income",
        category: "Salary",
        amount: 1000,
        description: "Salary",
      });

    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "expense",
        category: "Food",
        amount: 200,
        description: "Groceries",
      });
  });

  afterEach(async () => {
    // Clear cache after each test
    cacheService.clear();
  });

  test("GET /api/summary should return financial summary", async () => {
    const response = await request(app)
      .get("/api/summary")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.summary).toHaveProperty("totalIncome");
    expect(response.body.data.summary).toHaveProperty("totalExpenses");
    expect(response.body.data.summary).toHaveProperty("balance");
    expect(response.body.data.summary.totalIncome).toBe(1000);
    expect(response.body.data.summary.totalExpenses).toBe(200);
    expect(response.body.data.summary.balance).toBe(800);
  });
});

describe("Cache Functionality", () => {
  let authToken;

  beforeEach(async () => {
    // Setup authenticated user
    await fileService.writeFile("users", []);
    const registerResponse = await request(app)
      .post("/api/users/register")
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

    authToken = registerResponse.body.data.token;
  });

  afterEach(async () => {
    // Clear cache after each test
    cacheService.clear();
  });

  test("Should cache summary results", async () => {
    // First request
    const response1 = await request(app)
      .get("/api/summary")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    // Second request (should be from cache)
    const response2 = await request(app)
      .get("/api/summary")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(response1.body.data.summary.generatedAt).toBe(
      response2.body.data.summary.generatedAt,
    );
  });
});
