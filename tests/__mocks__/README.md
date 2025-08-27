# Mock Implementations

## Purpose
Mock implementations for external dependencies, APIs, and services used in testing. Ensures tests run consistently and don't depend on external services.

## Organization
Mocks are organized by the services or modules they replace:
- API service mocks
- External service mocks (WHOIS, SSL, reputation APIs)
- Browser API mocks
- React hook mocks

## Conventions
- **File Naming**: Match the module being mocked (e.g., `whois.ts` mocks `src/lib/analysis/whois.ts`)
- **Interface Compliance**: Mocks should implement the same interface as real services
- **Test Data**: Use realistic but safe test data
- **Jest Compatibility**: Follow Jest mocking conventions

## Usage
Mocks are automatically used by Jest when configured properly. They can also be imported directly in test files for custom behavior.

## Examples
```typescript
// __mocks__/lib/analysis/whois.ts
export const analyzeWhois = jest.fn().mockResolvedValue({
  domain: 'example.com',
  registrar: 'Test Registrar',
  createdDate: new Date('2020-01-01'),
  expiryDate: new Date('2025-01-01')
})

// Usage in test
import { analyzeWhois } from '@/lib/analysis/whois'

test('analyzes domain whois data', async () => {
  const result = await analyzeWhois('example.com')
  expect(result.domain).toBe('example.com')
})
```