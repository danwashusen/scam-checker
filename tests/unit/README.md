# Unit Tests

## Purpose
Unit tests for individual functions, components, and modules. Tests isolated functionality to ensure each unit works correctly in isolation.

## Organization
- **components/**: React component tests using React Testing Library
- **lib/**: Utility function and business logic tests
- **api/**: API route handler tests

## Conventions
- **Isolation**: Each test should be independent and not affect others
- **Coverage**: Test both happy paths and edge cases
- **Mocking**: Mock external dependencies and focus on unit behavior
- **Descriptive Names**: Test names should clearly describe the scenario
- **Fast Execution**: Unit tests should run quickly

## Usage
Unit tests run frequently during development and provide fast feedback on code changes.

## Examples
```typescript
// unit/lib/validation.test.ts
import { validateUrl } from '@/lib/validation'

describe('validateUrl', () => {
  test('validates correct URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true)
    expect(validateUrl('http://test.org')).toBe(true)
  })
  
  test('rejects invalid URLs', () => {
    expect(validateUrl('not-a-url')).toBe(false)
    expect(validateUrl('')).toBe(false)
  })
})

// unit/components/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toHaveTextContent('Click me')
})
```