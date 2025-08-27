# UI Components

## Purpose
Base UI components from shadcn/ui and custom design system components. These are the building blocks for all other components in the application.

## Organization
Components are organized as individual files, each exporting a single component with its variants and related types.

## Conventions
- **shadcn/ui**: Use shadcn/ui CLI to add components (`npx shadcn-ui@latest add button`)
- **Theming**: Support both light and dark themes
- **Accessibility**: All components must be accessible (ARIA labels, keyboard navigation)
- **Variants**: Use variant props for different styles
- **Composition**: Design for composition and flexibility

## Usage
Import UI components throughout the application. These components handle all basic interactions and styling patterns.

## Examples
```typescript
// From shadcn/ui
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// Usage
<Card>
  <CardHeader>Analysis Results</CardHeader>
  <CardContent>
    <Input placeholder="Enter URL..." />
    <Button variant="default">Analyze</Button>
  </CardContent>
</Card>
```

## Available Components
- button.tsx - Button component with variants
- input.tsx - Input field component
- card.tsx - Card layout component
- Additional components added via shadcn/ui CLI