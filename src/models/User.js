const bcrypt = require("bcryptjs");
const fileService = require("../services/fileService");
const {
  ValidationError,
  ConflictError,
  NotFoundError,
} = require("../utils/errors");

class User {
  constructor(userData) {
    this.id = userData.id || this.generateId();
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.preferences = userData.preferences || {};
    this.createdAt = userData.createdAt || new Date().toISOString();
    this.updatedAt = userData.updatedAt || new Date().toISOString();
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  static validateUserData(userData) {
    const errors = [];

    if (!userData.username || userData.username.trim().length < 3) {
      errors.push("Username must be at least 3 characters long");
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push("Valid email is required");
    }

    if (!userData.password || userData.password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(", "));
    }
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static async create(userData) {
    this.validateUserData(userData);

    // Check if user already exists
    const existingUsers = await fileService.readFile("users");
    const existingUser = existingUsers.find(
      (u) => u.email === userData.email || u.username === userData.username,
    );

    if (existingUser) {
      throw new ConflictError(
        "User with this email or username already exists",
      );
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password);

    const user = new User({
      ...userData,
      password: hashedPassword,
    });

    // Save to file
    await fileService.appendToFile("users", user);

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async findById(id) {
    const user = await fileService.findById("users", id);
    if (!user) {
      throw new NotFoundError("User");
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async findByEmail(email) {
    const users = await fileService.readFile("users");
    return users.find((u) => u.email === email) || null;
  }

  static async findByUsername(username) {
    const users = await fileService.readFile("users");
    const user = users.find((u) => u.username === username);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  static async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async updatePreferences(userId, preferences) {
    const updatedUser = await fileService.updateInFile("users", userId, {
      preferences,
      updatedAt: new Date().toISOString(),
    });

    if (!updatedUser) {
      throw new NotFoundError("User");
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}

module.exports = User;
