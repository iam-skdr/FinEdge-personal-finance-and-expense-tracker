const Transaction = require("../models/Transaction");
const { asyncHandler } = require("../middleware/errorHandler");
const { ValidationError, NotFoundError } = require("../utils/errors");
const cacheService = require("../services/cacheService");

// Add new transaction
const addTransaction = asyncHandler(async (req, res) => {
  const transactionData = {
    ...req.body,
    userId: req.user.id,
  };

  const transaction = await Transaction.create(transactionData);

  // Clear user's summary cache since data has changed
  cacheService.delete(`summary_${req.user.id}`);
  cacheService.delete(`transactions_${req.user.id}`);

  res.status(201).json({
    success: true,
    message: "Transaction added successfully",
    data: { transaction },
  });
});

// Get all transactions for user
const getTransactions = asyncHandler(async (req, res) => {
  const { type, category, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

  // Create cache key based on filters
  const cacheKey = `transactions_${req.user.id}_${JSON.stringify(req.query)}`;

  // Try to get from cache first
  let transactions = cacheService.get(cacheKey);

  if (!transactions) {
    const filters = { type, category, dateFrom, dateTo };

    // Remove undefined values
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    transactions = await Transaction.findByUserId(req.user.id, filters);

    // Cache the results for 5 minutes
    cacheService.set(cacheKey, transactions, 300000);
  }

  // Apply pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;

  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(transactions.length / limitNum),
    totalItems: transactions.length,
    itemsPerPage: limitNum,
    hasNext: endIndex < transactions.length,
    hasPrev: pageNum > 1,
  };

  res.json({
    success: true,
    data: {
      transactions: paginatedTransactions,
      pagination,
    },
  });
});

// Get single transaction
const getTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const transaction = await Transaction.findById(id, req.user.id);

  res.json({
    success: true,
    data: { transaction },
  });
});

// Update transaction
const updateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (Object.keys(req.body).length === 0) {
    throw new ValidationError("No data provided for update");
  }

  const transaction = await Transaction.update(id, req.body, req.user.id);

  // Clear user's cache since data has changed
  cacheService.delete(`summary_${req.user.id}`);
  cacheService.delete(`transactions_${req.user.id}`);

  res.json({
    success: true,
    message: "Transaction updated successfully",
    data: { transaction },
  });
});

// Delete transaction
const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Transaction.delete(id, req.user.id);

  // Clear user's cache since data has changed
  cacheService.delete(`summary_${req.user.id}`);
  cacheService.delete(`transactions_${req.user.id}`);

  res.json({
    success: true,
    message: "Transaction deleted successfully",
  });
});

// Get transactions by category
const getTransactionsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { type, dateFrom, dateTo } = req.query;

  const filters = { category, type, dateFrom, dateTo };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const transactions = await Transaction.findByUserId(req.user.id, filters);

  // Calculate category summary
  const summary = {
    totalAmount: 0,
    transactionCount: transactions.length,
    averageAmount: 0,
    categoryName: category,
  };

  transactions.forEach((transaction) => {
    summary.totalAmount += transaction.amount;
  });

  summary.averageAmount =
    transactions.length > 0
      ? Math.round((summary.totalAmount / transactions.length) * 100) / 100
      : 0;

  res.json({
    success: true,
    data: {
      transactions,
      summary,
    },
  });
});

// Bulk operations for transactions
const bulkOperations = asyncHandler(async (req, res) => {
  const { operation, transactionIds, updateData } = req.body;

  if (!operation || !transactionIds || !Array.isArray(transactionIds)) {
    throw new ValidationError(
      "Operation and transactionIds array are required",
    );
  }

  const results = [];
  const errors = [];

  switch (operation) {
    case "delete":
      for (const id of transactionIds) {
        try {
          await Transaction.delete(id, req.user.id);
          results.push({ id, status: "deleted" });
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }
      break;

    case "update":
      if (!updateData || typeof updateData !== "object") {
        throw new ValidationError(
          "Update data is required for update operation",
        );
      }

      for (const id of transactionIds) {
        try {
          const transaction = await Transaction.update(
            id,
            updateData,
            req.user.id,
          );
          results.push({ id, status: "updated", transaction });
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }
      break;

    case "categorize":
      const { newCategory } = updateData || {};
      if (!newCategory) {
        throw new ValidationError(
          "New category is required for categorize operation",
        );
      }

      for (const id of transactionIds) {
        try {
          const transaction = await Transaction.update(
            id,
            { category: newCategory },
            req.user.id,
          );
          results.push({ id, status: "categorized", transaction });
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }
      break;

    default:
      throw new ValidationError(
        "Invalid operation. Supported operations: delete, update, categorize",
      );
  }

  // Clear user's cache since data has changed
  cacheService.delete(`summary_${req.user.id}`);
  cacheService.delete(`transactions_${req.user.id}`);

  res.json({
    success: true,
    message: `Bulk ${operation} operation completed`,
    data: {
      successful: results,
      failed: errors,
      summary: {
        total: transactionIds.length,
        successful: results.length,
        failed: errors.length,
      },
    },
  });
});

module.exports = {
  addTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByCategory,
  bulkOperations,
};
