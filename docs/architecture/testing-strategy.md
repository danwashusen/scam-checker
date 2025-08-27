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
