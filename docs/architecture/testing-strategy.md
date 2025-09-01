# Testing Strategy

## Testing Pyramid

```
         E2E Tests (10%)
        /           \
    Integration Tests (30%)
    /                    \
Frontend Unit (30%)  Backend Unit (30%)
```

## Test Organization

We use a dedicated top-level `tests/` directory with clear separation of concerns and consistent naming.

### Test Types and Locations

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E API tests: `tests/e2e/api/`
- E2E UI tests: `tests/e2e/user-flows/`
- E2E Service tests: `tests/e2e/services/`
- Performance tests: `tests/performance/`

### File Naming Conventions

- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.ts` or `*.e2e.test.ts`
- Performance tests: `*.performance.ts` or `*.performance.test.ts`

Coverage target: 80% minimum across all test types

## API Endpoint E2E Testing Strategy

### Purpose
E2E API tests verify the complete flow of API endpoints with real external service integrations. These tests ensure that the API routes work correctly end-to-end without mocks, providing confidence in production-like scenarios.

### Key Characteristics
- **Real API calls**: No mocks - uses actual external services
- **Complete validation**: Verifies entire request/response flow
- **Flexible debugging**: Test any URL via environment variables
- **Performance tracking**: Monitors response times
- **Error handling**: Tests various failure scenarios

### Test Coverage Areas

#### Basic API Tests
- Request/response format validation
- Proper HTTP status codes
- Content-Type headers
- CORS configuration

#### Complete Analysis Tests
- Analysis of known clean URLs (e.g., google.com, github.com)
- Analysis of suspicious URL patterns
- Verification of complete response structure including:
  - Domain age information (WHOIS)
  - SSL certificate details
  - Reputation data
  - AI analysis results (when configured)
  - Risk scoring calculations

#### Edge Cases and Error Handling
- Invalid URL formats
- Missing URL in request body
- Malformed JSON requests
- Timeout handling
- Partial service failures
- Rate limiting behavior

#### Performance Tests
- Total analysis time measurement
- Response time validation
- Caching effectiveness for repeated requests

### Environment Variables for API E2E Tests
```bash
# Required for full testing
GOOGLE_SAFE_BROWSING_API_KEY=xxx
OPENAI_API_KEY=xxx  # Optional for AI analysis

# Optional for debugging
TEST_URL=https://example.com  # Custom URL to test
DEBUG_E2E=true  # Enable verbose logging
API_BASE_URL=http://localhost:3000  # Override API base URL
```

### Test Execution Commands
```bash
# Run all API E2E tests
npm run test:e2e:api

# Test with custom URL
TEST_URL=https://suspicious-site.com npm run test:e2e:api

# Watch mode for development
npm run test:e2e:api:watch

# Debug mode with verbose output
DEBUG_E2E=true npm run test:e2e:api
```

## External Service Integration Testing Strategy

### Unit & Integration Tests

- **Mock all external API calls** for fast, deterministic testing
- Test edge cases, error scenarios, and business logic thoroughly
- Use tools like `msw`, `nock`, or similar for request mocking
- Maintain comprehensive test coverage of all code paths

### End-to-End Service Tests

For internal services that integrate with external APIs, **E2E tests with real endpoints are mandatory** to verify:

- Service integration wiring is correct
- Authentication and network connectivity work
- Request/response format compatibility
- Basic functionality without comprehensive edge case testing

#### Required E2E Service Tests

**Reputation Service** (`tests/e2e/services/reputation-service.e2e.ts`):

- Test `ReputationService` integration with Google Safe Browsing API
- Verify basic threat detection functionality with real API calls
- Validate service properly handles API responses and errors

**WHOIS Service** (`tests/e2e/services/whois-service.e2e.ts`):

- Test `WhoisService` integration with WHOIS protocol
- Verify domain lookup functionality with real WHOIS queries
- Validate `WhoisParser` correctly processes real WHOIS data

**AI Service** (`tests/e2e/services/ai-service.e2e.ts`):

- Test `AiService` and `AiUrlAnalyzer` integration with AI APIs
- Verify URL analysis functionality with real AI API calls
- Validate service handles AI responses and formats output correctly

**SSL Service** (`tests/e2e/services/ssl-service.e2e.ts`):

- Test `SslService` certificate validation with real domains
- Verify SSL analysis functionality works with live certificates
- Validate service handles various certificate scenarios

#### E2E Service Test Configuration

- **Separate test suite**: Run independently with `npm run test:e2e:services`
- **Environment-specific**: Use test API keys and safe test domains
- **CI/CD integration**: Required to pass before production deployment
- **Rate limiting aware**: Implement delays and respect API quotas
- **Graceful failure**: Clear error messages when external services are unavailable
- **Test scope**: Focus on integration correctness, not comprehensive business logic
