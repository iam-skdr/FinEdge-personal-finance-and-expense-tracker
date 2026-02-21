const fileService = require("../services/fileService");
const { ValidationError, NotFoundError } = require("../utils/errors");

class Budget {
  constructor(budgetData) {
    this.id = budgetData.id || this.generateId();
    this.userId = budgetData.userId;
    this.month = budgetData.month; // Format: YYYY-MM
    this.monthlyGoal = parseFloat(budgetData.monthlyGoal) || 0;
    this.savingsTarget = parseFloat(budgetData.savingsTarget) || 0;
    this.categories = budgetData.categories || {}; // Category-wise budget limits
    this.createdAt = budgetData.createdAt || new Date().toISOString();
    this.updatedAt = budgetData.updatedAt || new Date().toISOString();
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  static validateBudgetData(budgetData) {
    const errors = [];

    if (!budgetData.userId) {
      errors.push("User ID is required");
    }

    if (!budgetData.month || !this.isValidMonthFormat(budgetData.month)) {
      errors.push("Month must be in YYYY-MM format");
    }

    if (
      budgetData.monthlyGoal !== undefined &&
      (isNaN(parseFloat(budgetData.monthlyGoal)) ||
        parseFloat(budgetData.monthlyGoal) < 0)
    ) {
      errors.push("Monthly goal must be a non-negative number");
    }

    if (
      budgetData.savingsTarget !== undefined &&
      (isNaN(parseFloat(budgetData.savingsTarget)) ||
        parseFloat(budgetData.savingsTarget) < 0)
    ) {
      errors.push("Savings target must be a non-negative number");
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }
  }

  static isValidMonthFormat(month) {
    const regex = /^\d{4}-\d{2}$/;
    if (!regex.test(month)) return false;

    const date = new Date(month + "-01");
    return date instanceof Date && !isNaN(date);
  }

  static async create(budgetData) {
    this.validateBudgetData(budgetData);

    // Check if budget for this month already exists for the user
    const existingBudget = await this.findByUserAndMonth(
      budgetData.userId,
      budgetData.month,
    );
    if (existingBudget) {
      throw new ValidationError("Budget for this month already exists");
    }

    const budget = new Budget(budgetData);
    await fileService.appendToFile("budgets", budget);

    return budget;
  }

  static async findById(id, userId = null) {
    const budget = await fileService.findById("budgets", id);
    if (!budget) {
      throw new NotFoundError("Budget");
    }

    if (userId && budget.userId !== userId) {
      throw new NotFoundError("Budget");
    }

    return budget;
  }

  static async findByUserAndMonth(userId, month) {
    const budgets = await fileService.readFile("budgets");
    return (
      budgets.find((b) => b.userId === userId && b.month === month) || null
    );
  }

  static async findByUserId(userId) {
    const budgets = await fileService.readFile("budgets");
    const userBudgets = budgets.filter((b) => b.userId === userId);

    // Sort by month (newest first)
    userBudgets.sort((a, b) => b.month.localeCompare(a.month));

    return userBudgets;
  }

  static async update(id, updateData, userId) {
    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No data provided for update");
    }

    // Validate update data
    const existingBudget = await this.findById(id, userId);
    const tempData = { ...existingBudget, ...updateData };
    this.validateBudgetData(tempData);

    const updatedBudget = await fileService.updateInFile("budgets", id, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    if (!updatedBudget || (userId && updatedBudget.userId !== userId)) {
      throw new NotFoundError("Budget");
    }

    return updatedBudget;
  }

  static async delete(id, userId) {
    await this.findById(id, userId);

    const deleted = await fileService.deleteFromFile("budgets", id);
    if (!deleted) {
      throw new NotFoundError("Budget");
    }

    return true;
  }

  // Get budget analysis with actual spending
  static async getBudgetAnalysis(userId, month) {
    const budget = await this.findByUserAndMonth(userId, month);
    if (!budget) {
      throw new NotFoundError("Budget for this month");
    }

    // Get actual transactions for the month
    const Transaction = require("./Transaction");
    const transactions = await Transaction.findByUserId(userId, {
      dateFrom: month + "-01",
      dateTo: month + "-31",
    });

    const analysis = {
      budget,
      actual: {
        totalIncome: 0,
        totalExpenses: 0,
        categories: {},
      },
      variance: {
        income: 0,
        expenses: 0,
        categories: {},
      },
      status: "on-track",
    };

    // Calculate actual spending
    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        analysis.actual.totalIncome += transaction.amount;
      } else {
        analysis.actual.totalExpenses += transaction.amount;

        if (!analysis.actual.categories[transaction.category]) {
          analysis.actual.categories[transaction.category] = 0;
        }
        analysis.actual.categories[transaction.category] += transaction.amount;
      }
    });

    // Calculate variances
    analysis.variance.income = analysis.actual.totalIncome - budget.monthlyGoal;
    analysis.variance.expenses =
      budget.monthlyGoal - analysis.actual.totalExpenses;

    // Category-wise variance
    Object.keys(budget.categories).forEach((category) => {
      const budgeted = budget.categories[category];
      const actual = analysis.actual.categories[category] || 0;
      analysis.variance.categories[category] = budgeted - actual;
    });

    // Determine overall status
    const savingsActual =
      analysis.actual.totalIncome - analysis.actual.totalExpenses;
    if (savingsActual >= budget.savingsTarget) {
      analysis.status = "exceeding";
    } else if (analysis.actual.totalExpenses > budget.monthlyGoal) {
      analysis.status = "over-budget";
    } else {
      analysis.status = "on-track";
    }

    return analysis;
  }

  // AI feature: Suggest budget adjustments based on spending patterns
  static async suggestBudgetAdjustments(userId) {
    const Transaction = require("./Transaction");

    // Get transactions from last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const dateFrom = threeMonthsAgo.toISOString().split("T")[0];

    const transactions = await Transaction.findByUserId(userId, { dateFrom });

    if (transactions.length === 0) {
      return { message: "Not enough transaction data to provide suggestions" };
    }

    // Analyze spending patterns
    const monthlyStats = {};
    const categoryStats = {};

    transactions.forEach((transaction) => {
      const month = transaction.date.substring(0, 7);

      if (!monthlyStats[month]) {
        monthlyStats[month] = { income: 0, expense: 0 };
      }

      if (!categoryStats[transaction.category]) {
        categoryStats[transaction.category] = { total: 0, count: 0 };
      }

      if (transaction.type === "income") {
        monthlyStats[month].income += transaction.amount;
      } else {
        monthlyStats[month].expense += transaction.amount;
        categoryStats[transaction.category].total += transaction.amount;
        categoryStats[transaction.category].count += 1;
      }
    });

    // Calculate averages
    const months = Object.keys(monthlyStats);
    const avgIncome =
      months.reduce((sum, month) => sum + monthlyStats[month].income, 0) /
      months.length;
    const avgExpense =
      months.reduce((sum, month) => sum + monthlyStats[month].expense, 0) /
      months.length;

    // Generate suggestions
    const suggestions = {
      recommendedMonthlyGoal: Math.round(avgExpense * 1.1), // 10% buffer
      recommendedSavingsTarget: Math.round(avgIncome * 0.2), // 20% of income
      categoryBudgets: {},
      tips: [],
    };

    // Category-wise recommendations
    Object.keys(categoryStats).forEach((category) => {
      const avgCategorySpending = categoryStats[category].total / months.length;
      suggestions.categoryBudgets[category] = Math.round(
        avgCategorySpending * 1.05,
      ); // 5% buffer
    });

    // Generate personalized tips
    const savingsRate = (avgIncome - avgExpense) / avgIncome;
    if (savingsRate < 0.1) {
      suggestions.tips.push(
        "Consider increasing your savings rate. Aim to save at least 10% of your income.",
      );
    }

    const topExpenseCategories = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 3);

    suggestions.tips.push(
      `Your top spending categories are: ${topExpenseCategories.map(([cat]) => cat).join(", ")}. Consider ways to optimize these expenses.`,
    );

    if (avgExpense > avgIncome * 0.8) {
      suggestions.tips.push(
        "Your expenses are quite high relative to income. Look for opportunities to reduce non-essential spending.",
      );
    }

    return suggestions;
  }
}

module.exports = Budget;
