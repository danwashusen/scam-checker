# Component Organization

## Purpose
Reusable React components organized by purpose and reusability level. Follows atomic design principles with clear separation between UI, business logic, and layout components.

## Organization
- **ui/**: Base UI components from shadcn/ui (buttons, inputs, cards, etc.)
- **analysis/**: URL analysis specific components (forms, results, displays)
- **layout/**: Layout and navigation components (header, footer, navigation)

## Conventions
- **Naming**: PascalCase for component files and exports
- **Props**: Always define TypeScript interfaces for props
- **Composition**: Prefer composition over inheritance
- **Client Components**: Mark with 'use client' when needed
- **Server Components**: Default for components that don't need interactivity

## Usage
Components should be pure and focused on presentation. Business logic should be kept in custom hooks or lib utilities.

## Examples
```typescript
// components/ui/button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  return <button className={`btn ${variant}`}>{children}</button>
}

// components/analysis/url-input-form.tsx
import { Button } from '@/components/ui/button'
import { useAnalysis } from '@/hooks/use-analysis'
```