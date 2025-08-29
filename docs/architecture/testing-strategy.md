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

- **Unit tests:** Colocated with source files using `.test.ts` suffix
- **Integration tests:** Separate tests/ directory
- **E2E tests:** Playwright tests in tests/e2e/

Coverage target: 80% minimum across all test types

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
