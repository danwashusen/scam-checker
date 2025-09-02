# Testing Strategy
## Pyramid & ownership
```
         E2E (10%)  → Playwright
      Integration (30%) → Jest (+ Supertest / MSW)
Unit & Component (60%) → Jest + React Testing Library
```
- **Do not expand E2E to compensate for missing unit/integration tests.** Keep E2E fast and purposeful.
