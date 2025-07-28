# Lumifi-BE

A Node.js-based serverless backend application powered by the Serverless Framework.

## **Getting Started**

### **Prerequisites**

- Node.js
- PostregresSQL
- Serverless Offline

### **Local Setup**

1. **PostgresSQL Setup**

   - Ensure you have a PostgreSQL database set up. Download and install it if not already installed.
   - Create a database with the name specified in your `.env.yml` file.

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Kazisu/lumifi-backend.git
   cd lumifi-backend
   ```

1. **Install Dependencies**

   ```bash
   npm install
   ```

1. **Configure Environment Variables**

   Create a separate environment file (e.g., `env.yml`) for your local configuration, and reference it in your `serverless.yml` using `${file(...)}` syntax:

   ```yaml
   custom:
     dev: ${file(./env.yml):dev}
   ```

   Your `env.yml` should contain:

   ```yaml
   dev:
     DB_HOST: <your_db_host_name>
     DB_USER: <your_db_user>
     DB_PASSWORD: <your_db_password>
     DB_NAME: <your_db_name>
     DB_PORT: <your_db_port>
     and other env variables...
   ```

---

1. **Serverless Offline Setup**

   - login/register in https://app.serverless.com/
   - npm i serverless -g
     - authenticate with serverless login
   - npm run start

### **Running the Application**

Start the development server:

```bash
npm run start
```

The app will be available at: [http://localhost:3001](http://localhost:3001)

---

### **Code Quality Commands**

- **Linting:**

  ```bash
  npm run lint        # Check for linting errors
  npm run lint:fix    # Auto-fix linting issues
  ```

- **Formatting:**

  ```bash
  npm run format:check  # Check code formatting
  npm run format:fix    # Auto-fix formatting issues
  ```

---

## **Technology Stack**

### Core Frameworks & Tools

- **Node.js** – JavaScript runtime
- **TypeScript** – Static typing
- **Serverless Framework** – Deploy Node.js apps to AWS Lambda
- **Sequelize** – ORM for PostgreSQL
- **Zod** – Schema validation
- **serverless-offline** – Local simulation of AWS Lambda/API Gateway

### Developer Tools

- **ts-node** – TypeScript execution
- **nodemon** – Live reloading in dev
- **eslint** – Linting
- **prettier** – Code formatting

---

### **Testing library**

- **Jest** - Testing library

---

## Project Structure

```
lumifi-backend/
│
├── src/                    # Application source code
│   ├── test/               # Test source code
│   ├── lib/                # Database & shared logic
│   ├── middlewares/        # Middlewares
│   ├── models/             # Sequelize models
│   ├── schemas/            # Zod schemas
│   ├── services/           # Business logic
│   ├── types/              # TypeScript interfaces
│   ├── handler/            # Route handlers
│   └── types/              # TypeScript interfaces
│
├── env.yml                 # Environment variables
├── serverless.yml          # Serverless deployment configuration
├── package.json            # Project metadata & scripts
├── tsconfig.json           # TypeScript compiler options
├── README.md               # Project documentation
└── other config files...   # Other configuration files
```

---
