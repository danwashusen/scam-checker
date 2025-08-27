# Layout Components

## Purpose
Layout and navigation components that provide the structural foundation for the application. These components handle the overall page layout, navigation, and consistent branding.

## Organization
- **header.tsx**: Site header with navigation and branding
- **footer.tsx**: Site footer with links and information
- **navigation.tsx**: Main navigation menu component

## Conventions
- **Responsive**: Mobile-first responsive design
- **Navigation**: Clear navigation hierarchy
- **Branding**: Consistent visual identity
- **Accessibility**: Proper semantic markup and ARIA labels
- **SEO**: Structured data and meta information

## Usage
Layout components are typically used in the root layout or page layouts to provide consistent structure across the application.

## Examples
```typescript
// layout/header.tsx
import { Navigation } from './navigation'

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">Scam Checker</h1>
          <Navigation />
        </div>
      </div>
    </header>
  )
}

// Usage in layout
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
```