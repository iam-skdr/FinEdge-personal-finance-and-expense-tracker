const { ValidationError } = require("../utils/errors");

// Validation middleware for transaction inputs
const validateTransaction = (req, res, next) => {
  try {
    const { type, category, amount, date } = req.body;
    const errors = [];

    // Validate type
    if (!type || !["income", "expense"].includes(type)) {
      errors.push('Transaction type must be either "income" or "expense"');
    }

    // Validate category
    if (
      !category ||
      typeof category !== "string" ||
      category.trim().length === 0
    ) {
      errors.push("Category is required and must be a non-empty string");
    }

    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      errors.push("Amount must be a positive number");
    }

    // Validate date (optional)
    if (date && !isValidDate(date)) {
      errors.push("Date must be in YYYY-MM-DD format");
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }

    // Sanitize inputs
    req.body.type = type.toLowerCase();
    req.body.category = category.trim();
    req.body.amount = parseFloat(amount);
    req.body.description = req.body.description
      ? req.body.description.trim()
      : "";

    next();
  } catch (error) {
    next(error);
  }
};

// Validation middleware for user registration
const validateUserRegistration = (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const errors = [];

    // Validate username
    if (
      !username ||
      typeof username !== "string" ||
      username.trim().length < 3
    ) {
      errors.push("Username must be at least 3 characters long");
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      errors.push("Valid email is required");
    }

    // Validate password
    if (!password || typeof password !== "string" || password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }

    // Sanitize inputs
    req.body.username = username.trim();
    req.body.email = email.toLowerCase().trim();

    next();
  } catch (error) {
    next(error);
  }
};

// Validation middleware for budget inputs
const validateBudget = (req, res, next) => {
  try {
    const { month, monthlyGoal, savingsTarget, categories } = req.body;
    const errors = [];

    // Validate month
    if (!month || !isValidMonthFormat(month)) {
      errors.push("Month must be in YYYY-MM format");
    }

    // Validate monthly goal
    if (monthlyGoal !== undefined) {
      if (isNaN(parseFloat(monthlyGoal)) || parseFloat(monthlyGoal) < 0) {
        errors.push("Monthly goal must be a non-negative number");
      }
    }

    // Validate savings target
    if (savingsTarget !== undefined) {
      if (isNaN(parseFloat(savingsTarget)) || parseFloat(savingsTarget) < 0) {
        errors.push("Savings target must be a non-negative number");
      }
    }

    // Validate categories (if provided)
    if (categories && typeof categories === "object") {
      Object.entries(categories).forEach(([category, amount]) => {
        if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
          errors.push(
            `Category "${category}" amount must be a non-negative number`,
          );
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }

    // Sanitize inputs
    if (monthlyGoal !== undefined) {
      req.body.monthlyGoal = parseFloat(monthlyGoal);
    }
    if (savingsTarget !== undefined) {
      req.body.savingsTarget = parseFloat(savingsTarget);
    }
    if (categories) {
      const sanitizedCategories = {};
      Object.entries(categories).forEach(([category, amount]) => {
        sanitizedCategories[category.trim()] = parseFloat(amount);
      });
      req.body.categories = sanitizedCategories;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// General query parameter validation
const validateQueryParams = (allowedParams = []) => {
  return (req, res, next) => {
    try {
      const queryKeys = Object.keys(req.query);
      const invalidParams = queryKeys.filter(
        (key) => !allowedParams.includes(key),
      );

      if (invalidParams.length > 0) {
        throw new ValidationError(
          `Invalid query parameters: ${invalidParams.join(", ")}`,
        );
      }

      // Validate date parameters
      ["dateFrom", "dateTo", "date"].forEach((param) => {
        if (req.query[param] && !isValidDate(req.query[param])) {
          throw new ValidationError(`${param} must be in YYYY-MM-DD format`);
        }
      });

      // Validate type parameter
      if (req.query.type && !["income", "expense"].includes(req.query.type)) {
        throw new ValidationError('Type must be either "income" or "expense"');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  // Basic XSS prevention - remove script tags and potentially harmful content
  const sanitizeString = (str) => {
    if (typeof str !== "string") return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== "object" || obj === null) return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === "object") {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Helper functions
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidMonthFormat(month) {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(month)) return false;

  const date = new Date(month + "-01");
  return date instanceof Date && !isNaN(date);
}

module.exports = {
  validateTransaction,
  validateUserRegistration,
  validateBudget,
  validateQueryParams,
  sanitizeInput,
};
