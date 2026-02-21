# Personal Finance Management API

A comprehensive RESTful API for personal finance management built with Node.js and Express, featuring transaction management, budget planning, financial analytics, and AI-powered insights.

## 🚀 Features

### Core Features

- **User Authentication & JWT**: Secure user registration, login, and session management
- **Transaction Management**: Add, view, update, and delete income/expense transactions
- **Budget Planning**: Create monthly budgets with category-wise limits and savings targets
- **Financial Analytics**: Comprehensive reporting with trends, categories, and insights
- **Auto-categorization**: AI-powered expense categorization based on transaction descriptions
- **Caching System**: In-memory cache with TTL expiry for improved performance
- **Rate Limiting**: Protect API from abuse with configurable rate limits

### Advanced Features

- **Real-time Analytics**: Calculate savings rate, expense ratios, and financial health metrics
- **Budget Analysis**: Compare actual spending against planned budgets
- **Spending Trends**: Track spending patterns over time with trend analysis
- **Smart Suggestions**: AI-powered budget recommendations based on spending history
- **Bulk Operations**: Perform batch updates on multiple transactions
- **Input Validation**: Comprehensive validation and sanitization for all inputs
- **Error Handling**: Global error handling with detailed error responses
- **Request Logging**: Detailed logging for monitoring and debugging

## 📋 Requirements Fulfilled

### 1. Fundamentals & Setup ✅

- [x] Project initialized with npm init
- [x] MVC architecture folder structure
- [x] `/health` route for server verification

### 2. REST API Development ✅

- [x] **User Management**: Registration, authentication, preferences
- [x] **Transaction Management**: Full CRUD operations
- [x] **Budget Management**: Create, update, analyze budgets
- [x] **Summary Endpoint**: Income-expense summary with analytics

### 3. Async Programming & Middleware ✅

- [x] **Async/Await**: Used throughout for file I/O operations
- [x] **Global Error Handling**: Comprehensive error middleware
- [x] **Custom Middleware**: Request logging, validation, authentication

### 4. Advanced Node Concepts ✅

- [x] **Modular Routes & Controllers**: Clean separation of concerns
- [x] **Reusable Services**: File service, cache service, sample data service
- [x] **Environment Variables**: Configuration management with dotenv
- [x] **Custom Error Classes**: Structured error handling
- [x] **Built-in fs/promises**: File persistence with async operations
- [x] **Test Cases**: Comprehensive test suite with Jest and Supertest
- [x] **JWT Authentication**: Mock user sessions with JWT tokens

### 5. Bonus Features ✅

#### A. Analytics & Reporting ✅

- [x] Calculate total income, expenses, and balance
- [x] Filter transactions by category/date
- [x] Show monthly trends and financial health metrics

#### B. AI/Automation Features ✅

- [x] Auto-categorize expenses using keyword matching
- [x] Suggest saving tips and budgets based on past spending
- [x] Smart budget recommendations with AI insights

#### C. Data Persistence ✅

- [x] JSON file-based storage with async file operations
- [x] Structured data models with validation

#### D. Advanced Middleware ✅

- [x] Rate limiter for API protection
- [x] CORS implementation for cross-origin requests
- [x] Request logging and monitoring
- [x] **In-memory cache service with TTL expiry**

## 🏗️ Project Structure

```
personal-finance-api/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── userController.js
│   │   ├── transactionController.js
│   │   ├── budgetController.js
│   │   └── summaryController.js
│   ├── models/              # Data models
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   └── Budget.js
│   ├── routes/              # API routes
│   │   ├── healthRoutes.js
│   │   ├── userRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── summaryRoutes.js
│   │   └── utilityRoutes.js
│   ├── services/            # Business logic
│   │   ├── fileService.js
│   │   ├── cacheService.js
│   │   └── sampleDataService.js
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── logger.js
│   │   └── errorHandler.js
│   ├── utils/               # Utilities
│   │   └── errors.js
│   └── app.js               # Express application
├── data/                    # JSON data storage
├── tests/                   # Test files
├── logs/                    # Application logs
├── server.js                # Server entry point
└── package.json
```

## 🚀 Quick Start

### Installation

```bash
# Clone or create the project
cd "c:\SKDR\PP\Plugin system"

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Database Configuration
DATA_PATH=./data

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL=300000
```

## 📚 API Documentation

### Authentication

#### Register User

```http
POST /api/users/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login User

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Transactions

#### Add Transaction

```http
POST /api/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "expense",
  "category": "Food & Dining",
  "amount": 25.50,
  "description": "Lunch at restaurant",
  "date": "2024-01-15"
}
```

#### Get Transactions

```http
GET /api/transactions?type=expense&category=Food&dateFrom=2024-01-01&dateTo=2024-01-31
Authorization: Bearer {token}
```

#### Update Transaction

```http
PATCH /api/transactions/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 30.00,
  "description": "Updated description"
}
```

### Budgets

#### Create Budget

```http
POST /api/budgets
Authorization: Bearer {token}
Content-Type: application/json

{
  "month": "2024-01",
  "monthlyGoal": 2500,
  "savingsTarget": 1000,
  "categories": {
    "Food & Dining": 400,
    "Transportation": 200,
    "Entertainment": 150
  }
}
```

#### Get Budget Analysis

```http
GET /api/budgets/month/2024-01/analysis
Authorization: Bearer {token}
```

### Summary & Analytics

#### Get Financial Summary

```http
GET /api/summary?month=2024-01
Authorization: Bearer {token}
```

#### Get Analytics

```http
GET /api/summary/analytics?period=month&limit=10
Authorization: Bearer {token}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## 🔧 Development Tools

### Generate Sample Data

```http
POST /api/utils/generate-sample-data
Authorization: Bearer {token}
```

### Clear User Data

```http
DELETE /api/utils/clear-data
Authorization: Bearer {token}
```

### Cache Statistics

```http
GET /api/utils/cache/stats
```

## 🏆 Key Highlights

### Performance

- **In-memory caching** with TTL expiry reduces database queries
- **Rate limiting** prevents API abuse
- **Pagination** for large datasets
- **Optimized queries** with filtering and sorting

### Security

- **JWT authentication** with secure token management
- **Password hashing** with bcrypt
- **Input validation** and sanitization
- **CORS protection** and security headers
- **Rate limiting** to prevent brute force attacks

### Code Quality

- **MVC architecture** for clean separation of concerns
- **Comprehensive error handling** with custom error classes
- **Extensive validation** for all inputs
- **Thorough testing** with Jest and Supertest
- **Detailed logging** for monitoring and debugging

### AI Features

- **Auto-categorization** of transactions using keyword matching
- **Smart budget suggestions** based on spending patterns
- **Financial health analysis** with trend detection
- **Personalized recommendations** for better financial management

## 📊 API Endpoints Summary

| Method | Endpoint                 | Description            | Auth |
| ------ | ------------------------ | ---------------------- | ---- |
| GET    | `/health`                | Server health check    | No   |
| GET    | `/status`                | Detailed server status | No   |
| POST   | `/api/users/register`    | Register new user      | No   |
| POST   | `/api/users/login`       | User login             | No   |
| GET    | `/api/users/profile`     | Get user profile       | Yes  |
| POST   | `/api/transactions`      | Add transaction        | Yes  |
| GET    | `/api/transactions`      | Get transactions       | Yes  |
| GET    | `/api/transactions/:id`  | Get single transaction | Yes  |
| PATCH  | `/api/transactions/:id`  | Update transaction     | Yes  |
| DELETE | `/api/transactions/:id`  | Delete transaction     | Yes  |
| POST   | `/api/budgets`           | Create budget          | Yes  |
| GET    | `/api/budgets`           | Get budgets            | Yes  |
| GET    | `/api/summary`           | Get financial summary  | Yes  |
| GET    | `/api/summary/analytics` | Get analytics          | Yes  |

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with Node.js and Express
- Authentication powered by JWT
- File persistence with Node.js fs/promises
- Testing with Jest and Supertest
- AI features for smart financial insights
