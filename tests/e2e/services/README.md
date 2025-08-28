# E2E Service Tests

## Overview
End-to-end tests for external service integrations. These tests make real API calls to verify service functionality.

## Setup

1. Copy `.env.test.example` to `.env.test`
2. Add your test API keys:
   - `GOOGLE_SAFE_BROWSING_TEST_API_KEY` - For reputation tests
   - `OPENAI_TEST_API_KEY` - For AI tests

## Running Tests

### All E2E Service Tests
```bash
npm run test:e2e:services
```

### Individual Services
```bash
npm run test:e2e:services:reputation
npm run test:e2e:services:whois
npm run test:e2e:services:ai
npm run test:e2e:services:ssl
```

### Watch Mode (Development)
```bash
npm run test:e2e:services:watch
```

## Test Behavior

- Tests run sequentially to avoid rate limiting
- Each test includes delays between API calls
- Tests skip automatically if API keys are missing
- Cache is disabled during E2E tests
- Timeouts are set to 60 seconds per test

## API Rate Limits

| Service | Delay Between Calls | Notes |
|---------|-------------------|-------|
| Google Safe Browsing | 1 second | 10,000 requests/day limit |
| WHOIS | 2 seconds | Strict rate limiting |
| OpenAI | 3 seconds | Depends on tier |
| SSL | 0.5 seconds | No external API |

## Troubleshooting

### Tests Timing Out
- Check network connectivity
- Verify API endpoints are accessible
- Increase timeout in test config

### Authentication Failures
- Verify API keys in `.env.test`
- Check key hasn't expired
- Ensure key has correct permissions

### Rate Limiting
- Tests include automatic delays
- Run tests sequentially with `--runInBand`
- Use separate test API keys with higher limits

### Flaky Tests
- External services may be temporarily unavailable
- Tests retry once automatically
- Check service status pages

## CI/CD Integration

Tests run in CI with:
- Secrets stored in GitHub secrets
- Graceful failure if services unavailable
- Non-blocking for deployment
- Results uploaded as artifacts

## Cost Management

- Use test-specific API keys
- Set appropriate quotas
- AI tests use cheaper models (gpt-3.5-turbo)
- Monitor usage through provider dashboards