module.exports = {
  // Set root directory to project root
  rootDir: '../../..',

  // Use Node environment for performance tests
  testEnvironment: 'node',

  // Only match performance test files
  testMatch: ['<rootDir>/tests/performance/**/*.test.(js|ts)', '<rootDir>/tests/performance/**/*.spec.(js|ts)'],

  // Longer default timeout for performance benchmarks
  testTimeout: 120000,

  // Transform TypeScript
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Run sequentially to reduce noise in timings
  maxWorkers: 1,

  // Disable coverage for performance tests
  collectCoverage: false,

  // Verbose output
  verbose: true,
}
