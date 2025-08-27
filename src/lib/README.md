# Library Utilities

## Purpose
Shared utilities, business logic, and external service integrations. This directory contains the core functionality that powers the application's features.

## Organization
- **utils.ts**: General utility functions (formatting, validation, etc.)
- **validation.ts**: URL validation and sanitization logic
- **cache.ts**: Caching utilities and configuration
- **analysis/**: Analysis engine utilities and integrations

## Conventions
- **Pure Functions**: Utilities should be pure functions when possible
- **Type Safety**: All functions should be fully typed
- **Error Handling**: Consistent error handling patterns
- **Testing**: High test coverage for business logic
- **Documentation**: JSDoc comments for complex functions

## Usage
Business logic is centralized here and imported by components, API routes, and hooks. This ensures consistent behavior across the application.

## Examples
```typescript
// lib/validation.ts
import { z } from 'zod'

export const urlSchema = z.string().url('Please enter a valid URL')

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// lib/utils.ts
export function formatRiskScore(score: number): string {
  return `${Math.round(score * 100)}%`
}
```