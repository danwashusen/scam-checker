# Testing Strategy

## Purpose
Comprehensive testing suite covering unit tests, integration tests, and end-to-end tests. Ensures code quality, reliability, and maintainability across the entire application.

## Organization
- **__mocks__/**: Mock implementations for external dependencies
- **unit/**: Unit tests for individual components and functions
- **integration/**: Integration tests for feature workflows
- **e2e/**: End-to-end tests using Playwright

## Conventions
- **Test Files**: Use `.test.ts` or `.test.tsx` extensions
- **Test Location**: Mirror source code structure in test directories
- **Naming**: Descriptive test names that explain the behavior being tested
- **AAA Pattern**: Arrange, Act, Assert structure for test cases
- **Coverage**: Aim for high test coverage, especially for critical paths

## Usage
Run tests during development and CI/CD pipeline. Use appropriate test type based on what you're testing.

## Examples
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```