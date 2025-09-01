module.exports = {
  // Set root directory to project root
  rootDir: '../..',
  
  // Use Node environment for E2E tests (not jsdom)
  testEnvironment: 'node',
  
  // Only match E2E API test files
  testMatch: [
    '<rootDir>/tests/e2e/api/**/*.e2e.ts'
  ],
  
  // Long timeouts for external API calls
  testTimeout: 60000, // 60 seconds per test
  
  // Setup file for E2E environment
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/api/helpers/setup.ts'],
  
  // Module mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform TypeScript
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  
  // Coverage disabled for E2E tests
  collectCoverage: false,
  
  // Verbose output to see what's happening
  verbose: true,
  
  // Run tests sequentially to avoid rate limiting
  maxWorkers: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}