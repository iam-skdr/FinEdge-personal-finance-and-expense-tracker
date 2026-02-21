const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const { authenticateToken } = require("../middleware/auth");
const { validateBudget, sanitizeInput } = require("../middleware/validation");

// Apply authentication and sanitization to all routes
router.use(authenticateToken);
router.use(sanitizeInput);

// Budget routes
router.post("/", validateBudget, budgetController.createBudget);
router.get("/", budgetController.getBudgets);
router.get("/current", budgetController.getCurrentBudgetStatus);
router.get("/suggestions", budgetController.getBudgetSuggestions);
router.post("/copy", budgetController.copyBudgetFromPrevious);

router.get("/month/:month", budgetController.getBudgetByMonth);
router.get("/month/:month/analysis", budgetController.getBudgetAnalysis);

router.get("/:id", budgetController.getBudget);
router.patch("/:id", validateBudget, budgetController.updateBudget);
router.delete("/:id", budgetController.deleteBudget);

module.exports = router;
