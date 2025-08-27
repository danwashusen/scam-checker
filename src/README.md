# Source Code Organization

## Purpose
Contains all application source code organized by functionality and component type. This directory follows Next.js App Router conventions with clear separation of concerns.

## Organization
- **app/**: Next.js App Router pages, layouts, and API routes
- **components/**: Reusable React components organized by purpose
- **lib/**: Shared utilities, business logic, and external integrations
- **types/**: TypeScript type definitions shared across the application
- **hooks/**: Custom React hooks for state management and side effects

## Conventions
- **Naming**: kebab-case for directories, PascalCase for React components
- **Imports**: Use absolute imports from `src/` root (configured in tsconfig.json)
- **Types**: Always import shared types from `src/types`
- **Business Logic**: Keep in `lib/` rather than components

## Usage
All application code should be placed within appropriate subdirectories. Components import utilities from `lib/`, types from `types/`, and use custom hooks from `hooks/`.

## Examples
```typescript
// Component imports
import { UrlInputForm } from '@/components/analysis/url-input-form'
import { Button } from '@/components/ui/button'

// Utility imports
import { validateUrl } from '@/lib/validation'
import { analyzeUrl } from '@/lib/analysis/scoring'

// Type imports
import { AnalysisResult } from '@/types/analysis'
```