const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");

class SampleDataService {
  static async generateSampleData(userId) {
    try {
      console.log("Generating sample data for user:", userId);

      // Sample transactions for the last 3 months
      const transactions = [];
      const currentDate = new Date();

      // Generate transactions for last 3 months
      for (let month = 0; month < 3; month++) {
        const targetDate = new Date(currentDate);
        targetDate.setMonth(targetDate.getMonth() - month);
        const monthStr = targetDate.toISOString().substring(0, 7);

        // Income transactions
        transactions.push({
          userId,
          type: "income",
          category: "Salary",
          amount: 5000,
          description: "Monthly salary",
          date: `${monthStr}-01`,
        });

        transactions.push({
          userId,
          type: "income",
          category: "Freelance",
          amount: 800,
          description: "Freelance project",
          date: `${monthStr}-15`,
        });

        // Expense transactions
        const expenses = [
          {
            category: "Food & Dining",
            amount: 400,
            description: "Groceries and restaurants",
          },
          {
            category: "Transportation",
            amount: 200,
            description: "Gas and public transport",
          },
          {
            category: "Utilities",
            amount: 150,
            description: "Electricity and internet",
          },
          {
            category: "Entertainment",
            amount: 100,
            description: "Movies and subscriptions",
          },
          {
            category: "Healthcare",
            amount: 75,
            description: "Medical expenses",
          },
          {
            category: "Shopping",
            amount: 250,
            description: "Clothing and misc items",
          },
          { category: "Rent", amount: 1200, description: "Monthly rent" },
        ];

        expenses.forEach((expense, index) => {
          transactions.push({
            userId,
            type: "expense",
            category: expense.category,
            amount: expense.amount + (Math.random() * 50 - 25), // Add some variation
            description: expense.description,
            date: `${monthStr}-${String(5 + index * 3).padStart(2, "0")}`,
          });
        });
      }

      // Create transactions
      for (const transactionData of transactions) {
        await Transaction.create(transactionData);
      }

      // Create sample budgets for current and next month
      const currentMonth = currentDate.toISOString().substring(0, 7);
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().substring(0, 7);

      const budgets = [
        {
          userId,
          month: currentMonth,
          monthlyGoal: 2500,
          savingsTarget: 1000,
          categories: {
            "Food & Dining": 450,
            Transportation: 250,
            Utilities: 200,
            Entertainment: 150,
            Healthcare: 100,
            Shopping: 300,
            Rent: 1200,
          },
        },
        {
          userId,
          month: nextMonthStr,
          monthlyGoal: 2400,
          savingsTarget: 1100,
          categories: {
            "Food & Dining": 400,
            Transportation: 250,
            Utilities: 200,
            Entertainment: 120,
            Healthcare: 100,
            Shopping: 250,
            Rent: 1200,
          },
        },
      ];

      for (const budgetData of budgets) {
        try {
          await Budget.create(budgetData);
        } catch (error) {
          // Budget might already exist, skip
          console.log(`Budget for ${budgetData.month} already exists`);
        }
      }

      return {
        transactionsCreated: transactions.length,
        budgetsCreated: budgets.length,
        message: "Sample data generated successfully",
      };
    } catch (error) {
      console.error("Error generating sample data:", error);
      throw error;
    }
  }

  static async clearUserData(userId) {
    try {
      const fileService = require("../services/fileService");

      // Get all transactions and budgets
      const transactions = await fileService.readFile("transactions");
      const budgets = await fileService.readFile("budgets");

      // Filter out user's data
      const filteredTransactions = transactions.filter(
        (t) => t.userId !== userId,
      );
      const filteredBudgets = budgets.filter((b) => b.userId !== userId);

      // Write back the filtered data
      await fileService.writeFile("transactions", filteredTransactions);
      await fileService.writeFile("budgets", filteredBudgets);

      return { message: "User data cleared successfully" };
    } catch (error) {
      console.error("Error clearing user data:", error);
      throw error;
    }
  }
}

module.exports = SampleDataService;
