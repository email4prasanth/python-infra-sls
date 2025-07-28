export default {
  preset: 'ts-jest',
  collectCoverage: false, // Enables coverage collection
  coverageDirectory: 'coverage', // Specifies the directory for coverage reports
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}', // Include source files
    '!src/**/*.d.ts', // Exclude declaration files
    '!src/app.ts', // Exclude app.js
    '!src/server.ts', // Exclude index.js
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/', // Exclude node modules
    'src/app.ts', // Exclude app.js
    'src/server.ts', // Exclude index.js
    'src/schemas/', // Exclude schemas
    'src/handler.ts', // Exclude schemas
    'src/.*/index\\.ts$', // Exclude index.ts files
  ],
  coverageReporters: ['text', 'lcov', 'html'], // Specifies output formats
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Optional: for path aliases
  },
  globals: {
    'ts-jest': {
      diagnostics: false, // Set to true to enable type checking
    },
  },
};
