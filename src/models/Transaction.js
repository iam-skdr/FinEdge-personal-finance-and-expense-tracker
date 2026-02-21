const fileService = require("../services/fileService");
const { ValidationError, NotFoundError } = require("../utils/errors");

class Transaction {
  constructor(transactionData) {
    this.id = transactionData.id || this.generateId();
    this.userId = transactionData.userId;
    this.type = transactionData.type; // 'income' or 'expense'
    this.category = transactionData.category;
    this.amount = parseFloat(transactionData.amount);
    this.description = transactionData.description || "";
    this.date = transactionData.date || new Date().toISOString().split("T")[0];
    this.createdAt = transactionData.createdAt || new Date().toISOString();
    this.updatedAt = transactionData.updatedAt || new Date().toISOString();
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  static validateTransactionData(transactionData) {
    const errors = [];

    if (!transactionData.userId) {
      errors.push("User ID is required");
    }

    if (
      !transactionData.type ||
      !["income", "expense"].includes(transactionData.type)
    ) {
      errors.push('Transaction type must be either "income" or "expense"');
    }

    if (
      !transactionData.category ||
      transactionData.category.trim().length === 0
    ) {
      errors.push("Category is required");
    }

    if (
      !transactionData.amount ||
      isNaN(parseFloat(transactionData.amount)) ||
      parseFloat(transactionData.amount) <= 0
    ) {
      errors.push("Amount must be a positive number");
    }

    if (transactionData.date && !this.isValidDate(transactionData.date)) {
      errors.push("Date must be in YYYY-MM-DD format");
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }
  }

  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  static async create(transactionData) {
    this.validateTransactionData(transactionData);

    // Auto-categorize based on keywords if category is generic
    const categorizedData =
      await this.autoCategorizeTransaction(transactionData);

    const transaction = new Transaction(categorizedData);
    await fileService.appendToFile("transactions", transaction);

    return transaction;
  }

  static async findById(id, userId = null) {
    const transaction = await fileService.findById("transactions", id);
    if (!transaction) {
      throw new NotFoundError("Transaction");
    }

    // If userId is provided, ensure the transaction belongs to the user
    if (userId && transaction.userId !== userId) {
      throw new NotFoundError("Transaction");
    }

    return transaction;
  }

  static async findByUserId(userId, filters = {}) {
    const transactions = await fileService.readFile("transactions");
    let userTransactions = transactions.filter((t) => t.userId === userId);

    // Apply filters
    if (filters.type) {
      userTransactions = userTransactions.filter(
        (t) => t.type === filters.type,
      );
    }

    if (filters.category) {
      userTransactions = userTransactions.filter((t) =>
        t.category.toLowerCase().includes(filters.category.toLowerCase()),
      );
    }

    if (filters.dateFrom) {
      userTransactions = userTransactions.filter(
        (t) => t.date >= filters.dateFrom,
      );
    }

    if (filters.dateTo) {
      userTransactions = userTransactions.filter(
        (t) => t.date <= filters.dateTo,
      );
    }

    // Sort by date (newest first)
    userTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return userTransactions;
  }

  static async update(id, updateData, userId) {
    // Validate update data
    if (Object.keys(updateData).length === 0) {
      throw new ValidationError("No data provided for update");
    }

    // Create a temporary object with current transaction data and updates
    const existingTransaction = await this.findById(id, userId);
    const tempData = { ...existingTransaction, ...updateData };
    this.validateTransactionData(tempData);

    // Perform the update
    const updatedTransaction = await fileService.updateInFile(
      "transactions",
      id,
      {
        ...updateData,
        updatedAt: new Date().toISOString(),
      },
    );

    if (
      !updatedTransaction ||
      (userId && updatedTransaction.userId !== userId)
    ) {
      throw new NotFoundError("Transaction");
    }

    return updatedTransaction;
  }

  static async delete(id, userId) {
    // Check if transaction exists and belongs to user
    await this.findById(id, userId);

    const deleted = await fileService.deleteFromFile("transactions", id);
    if (!deleted) {
      throw new NotFoundError("Transaction");
    }

    return true;
  }

  // Auto-categorization feature (AI/Automation bonus)
  static async autoCategorizeTransaction(transactionData) {
    const { description, category } = transactionData;

    // Define keyword mappings for auto-categorization
    const categoryMappings = {
      "Food & Dining": [
        "restaurant",
        "food",
        "grocery",
        "cafe",
        "pizza",
        "mcdonalds",
        "starbucks",
      ],
      Transportation: [
        "gas",
        "fuel",
        "uber",
        "taxi",
        "metro",
        "bus",
        "parking",
      ],
      Shopping: ["amazon", "ebay", "mall", "store", "shopping"],
      Entertainment: ["movie", "cinema", "netflix", "spotify", "game"],
      Utilities: ["electric", "water", "internet", "phone", "cable"],
      Healthcare: ["hospital", "doctor", "pharmacy", "medicine", "clinic"],
      Education: ["school", "course", "book", "tuition"],
      Salary: ["salary", "wage", "paycheck"],
      Freelance: ["freelance", "contract", "consulting"],
      Investment: ["dividend", "interest", "stock", "bond"],
    };

    // If category is generic or empty, try to auto-categorize
    if (
      !category ||
      category.toLowerCase() === "general" ||
      category.toLowerCase() === "other"
    ) {
      const lowerDescription = (description || "").toLowerCase();

      for (const [cat, keywords] of Object.entries(categoryMappings)) {
        if (keywords.some((keyword) => lowerDescription.includes(keyword))) {
          return { ...transactionData, category: cat };
        }
      }
    }

    return transactionData;
  }

  // Get summary statistics
  static async getSummary(userId, monthYear = null) {
    const transactions = await this.findByUserId(userId);

    let filteredTransactions = transactions;

    if (monthYear) {
      // Filter by month-year (format: YYYY-MM)
      filteredTransactions = transactions.filter((t) =>
        t.date.startsWith(monthYear),
      );
    }

    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: filteredTransactions.length,
      categories: {},
      monthlyTrends: {},
    };

    filteredTransactions.forEach((transaction) => {
      if (transaction.type === "income") {
        summary.totalIncome += transaction.amount;
      } else {
        summary.totalExpenses += transaction.amount;
      }

      // Category breakdown
      if (!summary.categories[transaction.category]) {
        summary.categories[transaction.category] = {
          income: 0,
          expense: 0,
          count: 0,
        };
      }

      summary.categories[transaction.category][transaction.type] +=
        transaction.amount;
      summary.categories[transaction.category].count += 1;

      // Monthly trends
      const month = transaction.date.substring(0, 7); // YYYY-MM
      if (!summary.monthlyTrends[month]) {
        summary.monthlyTrends[month] = { income: 0, expense: 0 };
      }
      summary.monthlyTrends[month][transaction.type] += transaction.amount;
    });

    summary.balance = summary.totalIncome - summary.totalExpenses;

    return summary;
  }
}

module.exports = Transaction;
