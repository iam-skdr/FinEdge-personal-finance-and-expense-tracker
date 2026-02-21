const Budget = require("../models/Budget");
const { asyncHandler } = require("../middleware/errorHandler");
const { ValidationError } = require("../utils/errors");

// Create new budget
const createBudget = asyncHandler(async (req, res) => {
  const budgetData = {
    ...req.body,
    userId: req.user.id,
  };

  const budget = await Budget.create(budgetData);

  res.status(201).json({
    success: true,
    message: "Budget created successfully",
    data: { budget },
  });
});

// Get all budgets for user
const getBudgets = asyncHandler(async (req, res) => {
  const budgets = await Budget.findByUserId(req.user.id);

  res.json({
    success: true,
    data: { budgets },
  });
});

// Get single budget
const getBudget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const budget = await Budget.findById(id, req.user.id);

  res.json({
    success: true,
    data: { budget },
  });
});

// Get budget by month
const getBudgetByMonth = asyncHandler(async (req, res) => {
  const { month } = req.params;

  // Validate month format
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    throw new ValidationError("Month must be in YYYY-MM format");
  }

  const budget = await Budget.findByUserAndMonth(req.user.id, month);

  if (!budget) {
    return res.json({
      success: true,
      message: "No budget found for this month",
      data: { budget: null },
    });
  }

  res.json({
    success: true,
    data: { budget },
  });
});

// Update budget
const updateBudget = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (Object.keys(req.body).length === 0) {
    throw new ValidationError("No data provided for update");
  }

  const budget = await Budget.update(id, req.body, req.user.id);

  res.json({
    success: true,
    message: "Budget updated successfully",
    data: { budget },
  });
});

// Delete budget
const deleteBudget = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Budget.delete(id, req.user.id);

  res.json({
    success: true,
    message: "Budget deleted successfully",
  });
});

// Get budget analysis (actual vs planned)
const getBudgetAnalysis = asyncHandler(async (req, res) => {
  const { month } = req.params;

  // Validate month format
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    throw new ValidationError("Month must be in YYYY-MM format");
  }

  const analysis = await Budget.getBudgetAnalysis(req.user.id, month);

  res.json({
    success: true,
    data: { analysis },
  });
});

// Get budget suggestions based on spending patterns
const getBudgetSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await Budget.suggestBudgetAdjustments(req.user.id);

  res.json({
    success: true,
    data: { suggestions },
  });
});

// Get current month budget status
const getCurrentBudgetStatus = asyncHandler(async (req, res) => {
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

  try {
    const analysis = await Budget.getBudgetAnalysis(req.user.id, currentMonth);

    res.json({
      success: true,
      data: {
        month: currentMonth,
        analysis,
      },
    });
  } catch (error) {
    // If no budget exists for current month, return empty analysis
    if (error.message.includes("Budget for this month")) {
      res.json({
        success: true,
        message: "No budget set for current month",
        data: {
          month: currentMonth,
          analysis: null,
        },
      });
    } else {
      throw error;
    }
  }
});

// Copy budget from previous month
const copyBudgetFromPrevious = asyncHandler(async (req, res) => {
  const { month } = req.body;

  if (!month) {
    throw new ValidationError("Target month is required");
  }

  // Validate month format
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    throw new ValidationError("Month must be in YYYY-MM format");
  }

  // Calculate previous month
  const targetDate = new Date(month + "-01");
  const prevMonthDate = new Date(targetDate);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonth = prevMonthDate.toISOString().substring(0, 7);

  // Get previous month's budget
  const prevBudget = await Budget.findByUserAndMonth(req.user.id, prevMonth);

  if (!prevBudget) {
    throw new ValidationError(`No budget found for ${prevMonth} to copy from`);
  }

  // Create new budget with previous month's data
  const newBudgetData = {
    month,
    monthlyGoal: prevBudget.monthlyGoal,
    savingsTarget: prevBudget.savingsTarget,
    categories: { ...prevBudget.categories },
    userId: req.user.id,
  };

  const budget = await Budget.create(newBudgetData);

  res.status(201).json({
    success: true,
    message: `Budget copied from ${prevMonth} to ${month}`,
    data: { budget },
  });
});

module.exports = {
  createBudget,
  getBudgets,
  getBudget,
  getBudgetByMonth,
  updateBudget,
  deleteBudget,
  getBudgetAnalysis,
  getBudgetSuggestions,
  getCurrentBudgetStatus,
  copyBudgetFromPrevious,
};
