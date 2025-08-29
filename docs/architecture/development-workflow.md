# Development Workflow

## Local Development Setup

### Prerequisites
```bash
node --version  # v22.x required
npm --version   # v10.x or higher
aws --version   # AWS CLI v2
terraform --version  # v1.6.x
```

### Development Commands
```bash
# Start all services (frontend + mock API)
npm run dev

# Run tests
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests (mocked external services)
npm run test:e2e         # E2E UI tests (Playwright)
npm run test:e2e:services # E2E service tests (real external APIs)

# Build commands
npm run build         # Build frontend
npm run build:lambda  # Build Lambda functions
```

## Development Process Requirements

### External Service Integration Development

When developing or modifying services in `src/lib/analysis/` that integrate with external APIs:

1. **Unit Tests First**: Write comprehensive unit tests with mocked external services
   - Mock all external API calls using `msw`, `nock`, or similar
   - Test all business logic, edge cases, and error scenarios
   - Achieve minimum 80% test coverage

2. **E2E Service Test Requirement**: Create corresponding E2E test in `tests/e2e/services/`
   - Test file naming: `{service-name}.e2e.ts` (e.g., `reputation-service.e2e.ts`)
   - **Purpose**: Verify integration wiring with real external endpoints
   - **Scope**: Basic functionality only - not comprehensive edge case testing
   - **Requirements**:
     - Authentication/API key validation works
     - Request format is accepted by external service
     - Response format matches service expectations
     - Basic error handling for service unavailability

3. **CI/CD Integration**: Both test suites must pass before deployment
   - Unit/integration tests run on every commit
   - E2E service tests run before production deployment
   - E2E service test failures block deployment

### E2E Service Test Guidelines

- **Environment Setup**: Use dedicated test API keys and test-safe domains
- **Rate Limiting**: Implement appropriate delays between test runs
- **Test Data**: Use predictable, safe test inputs (avoid random URLs)
- **Error Handling**: Tests should gracefully handle external service outages
- **Documentation**: Document any special test environment requirements
