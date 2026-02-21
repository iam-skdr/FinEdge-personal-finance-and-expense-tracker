const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { authenticateToken } = require("../middleware/auth");
const {
  validateTransaction,
  validateQueryParams,
  sanitizeInput,
} = require("../middleware/validation");

// Apply authentication and sanitization to all routes
router.use(authenticateToken);
router.use(sanitizeInput);

// Transaction routes
router.post("/", validateTransaction, transactionController.addTransaction);

router.get(
  "/",
  validateQueryParams([
    "type",
    "category",
    "dateFrom",
    "dateTo",
    "page",
    "limit",
  ]),
  transactionController.getTransactions,
);

router.get("/:id", transactionController.getTransaction);

router.patch(
  "/:id",
  validateTransaction,
  transactionController.updateTransaction,
);

router.delete("/:id", transactionController.deleteTransaction);

// Category-specific routes
router.get(
  "/category/:category",
  validateQueryParams(["type", "dateFrom", "dateTo"]),
  transactionController.getTransactionsByCategory,
);

// Bulk operations
router.post("/bulk", transactionController.bulkOperations);

module.exports = router;
