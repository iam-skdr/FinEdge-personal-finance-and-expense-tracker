const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { asyncHandler } = require("../middleware/errorHandler");
const cacheService = require("../services/cacheService");

// Get income-expense summary
const getSummary = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const userId = req.user.id;

  // Create cache key based on user and month filter
  const cacheKey = `summary_${userId}${month ? `_${month}` : ""}`;

  // Try to get from cache first
  let summary = cacheService.get(cacheKey);

  if (!summary) {
    // Generate summary
    summary = await Transaction.getSummary(userId, month);

    // Add additional financial metrics
    summary.savingsRate =
      summary.totalIncome > 0
        ? Math.round((summary.balance / summary.totalIncome) * 100 * 100) / 100
        : 0;

    summary.expenseRatio =
      summary.totalIncome > 0
        ? Math.round(
            (summary.totalExpenses / summary.totalIncome) * 100 * 100,
          ) / 100
        : 0;

    // Add date range info
    summary.period = month || "all-time";
    summary.generatedAt = new Date().toISOString();

    // Cache the summary for 5 minutes
    cacheService.set(cacheKey, summary, 300000);
  }

  res.json({
    success: true,
    data: { summary },
  });
});

// Get analytics and reporting data
const getAnalytics = asyncHandler(async (req, res) => {
  const { period = "month", category, limit = 10 } = req.query;
  const userId = req.user.id;

  // Create cache key for analytics
  const cacheKey = `analytics_${userId}_${period}_${category || "all"}_${limit}`;

  let analytics = cacheService.get(cacheKey);

  if (!analytics) {
    const transactions = await Transaction.findByUserId(userId);

    analytics = {
      period,
      generatedAt: new Date().toISOString(),
      totalTransactions: transactions.length,
    };

    if (transactions.length === 0) {
      analytics.message = "No transactions found for analysis";
      return res.json({
        success: true,
        data: { analytics },
      });
    }

    // Calculate date ranges based on period
    const now = new Date();
    const periodFilters = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      quarter: new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      ),
      year: new Date(now.getFullYear(), 0, 1),
    };

    const startDate = periodFilters[period];
    const filteredTransactions = startDate
      ? transactions.filter((t) => new Date(t.date) >= startDate)
      : transactions;

    // Category-wise breakdown
    const categoryBreakdown = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach((transaction) => {
      if (!categoryBreakdown[transaction.category]) {
        categoryBreakdown[transaction.category] = {
          income: 0,
          expense: 0,
          count: 0,
          percentage: 0,
        };
      }

      categoryBreakdown[transaction.category][transaction.type] +=
        transaction.amount;
      categoryBreakdown[transaction.category].count += 1;

      if (transaction.type === "income") {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
    });

    // Calculate percentages
    Object.keys(categoryBreakdown).forEach((category) => {
      const categoryData = categoryBreakdown[category];
      const categoryTotal = categoryData.income + categoryData.expense;
      const totalAmount = totalIncome + totalExpenses;
      categoryData.percentage =
        totalAmount > 0
          ? Math.round((categoryTotal / totalAmount) * 100 * 100) / 100
          : 0;
    });

    // Top spending categories
    const topSpendingCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b.expense - a.expense)
      .slice(0, parseInt(limit))
      .map(([category, data]) => ({
        category,
        amount: data.expense,
        percentage: data.percentage,
        transactionCount: data.count,
      }));

    // Monthly trends (last 12 months)
    const monthlyTrends = {};
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().substring(0, 7);
    }).reverse();

    last12Months.forEach((month) => {
      monthlyTrends[month] = { income: 0, expense: 0, balance: 0 };
    });

    transactions.forEach((transaction) => {
      const month = transaction.date.substring(0, 7);
      if (monthlyTrends[month]) {
        monthlyTrends[month][transaction.type] += transaction.amount;
      }
    });

    // Calculate balance for each month
    Object.keys(monthlyTrends).forEach((month) => {
      const data = monthlyTrends[month];
      data.balance = data.income - data.expense;
    });

    // Weekly trends for current month
    const currentMonth = now.toISOString().substring(0, 7);
    const currentMonthTransactions = transactions.filter((t) =>
      t.date.startsWith(currentMonth),
    );

    const weeklyTrends = {};
    currentMonthTransactions.forEach((transaction) => {
      const week = `Week ${Math.ceil(parseInt(transaction.date.split("-")[2]) / 7)}`;
      if (!weeklyTrends[week]) {
        weeklyTrends[week] = { income: 0, expense: 0 };
      }
      weeklyTrends[week][transaction.type] += transaction.amount;
    });

    // Financial health indicators
    const avgMonthlyIncome =
      Object.values(monthlyTrends).reduce(
        (sum, month) => sum + month.income,
        0,
      ) / 12;

    const avgMonthlyExpenses =
      Object.values(monthlyTrends).reduce(
        (sum, month) => sum + month.expense,
        0,
      ) / 12;

    const financialHealth = {
      avgMonthlySavings: avgMonthlyIncome - avgMonthlyExpenses,
      savingsRate:
        avgMonthlyIncome > 0
          ? Math.round(
              ((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) *
                100 *
                100,
            ) / 100
          : 0,
      expenseVolatility: calculateVolatility(
        Object.values(monthlyTrends).map((m) => m.expense),
      ),
      incomeStability: calculateStability(
        Object.values(monthlyTrends).map((m) => m.income),
      ),
    };

    analytics = {
      ...analytics,
      summary: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        transactionCount: filteredTransactions.length,
      },
      categoryBreakdown,
      topSpendingCategories,
      monthlyTrends,
      weeklyTrends,
      financialHealth,
    };

    // Cache analytics for 10 minutes
    cacheService.set(cacheKey, analytics, 600000);
  }

  res.json({
    success: true,
    data: { analytics },
  });
});

// Get spending trends
const getSpendingTrends = asyncHandler(async (req, res) => {
  const { category, months = 6 } = req.query;
  const userId = req.user.id;

  const filters = {};
  if (category) filters.category = category;

  const transactions = await Transaction.findByUserId(userId, filters);

  // Group by month
  const monthlyData = {};

  transactions.forEach((transaction) => {
    const month = transaction.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0, count: 0 };
    }

    monthlyData[month][transaction.type] += transaction.amount;
    monthlyData[month].count += 1;
  });

  // Get last N months
  const recentMonths = Object.keys(monthlyData).sort().slice(-parseInt(months));

  const trends = recentMonths.map((month) => ({
    month,
    ...monthlyData[month],
    balance: monthlyData[month].income - monthlyData[month].expense,
  }));

  // Calculate trend direction
  const expenseAmounts = trends.map((t) => t.expense);
  const trendDirection =
    expenseAmounts.length >= 2
      ? expenseAmounts[expenseAmounts.length - 1] >
        expenseAmounts[expenseAmounts.length - 2]
        ? "increasing"
        : "decreasing"
      : "stable";

  res.json({
    success: true,
    data: {
      trends,
      summary: {
        period: `Last ${months} months`,
        category: category || "all categories",
        trendDirection,
        totalMonths: trends.length,
      },
    },
  });
});

// Helper function to calculate volatility (standard deviation)
function calculateVolatility(values) {
  if (values.length <= 1) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.round(Math.sqrt(variance) * 100) / 100;
}

// Helper function to calculate income stability (coefficient of variation)
function calculateStability(values) {
  if (values.length <= 1) return 100;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;

  const volatility = calculateVolatility(values);
  const stabilityScore = Math.max(0, 100 - (volatility / mean) * 100);

  return Math.round(stabilityScore * 100) / 100;
}

module.exports = {
  getSummary,
  getAnalytics,
  getSpendingTrends,
};
