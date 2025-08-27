# Image Assets

## Purpose
Image assets for the application including logos, screenshots, illustrations, and other graphics used throughout the user interface.

## Organization
Organize images by purpose and feature area:
- **branding/**: Logos, brand assets
- **ui/**: User interface graphics, illustrations
- **screenshots/**: Application screenshots for documentation

## Conventions
- **Formats**: Use WebP or AVIF for better compression, with PNG/JPG fallbacks
- **Sizing**: Provide multiple sizes (1x, 2x, 3x) for different screen densities
- **Naming**: Descriptive names with size indicators (e.g., `logo-small.webp`, `hero-1920x1080.jpg`)
- **Optimization**: Compress images without quality loss
- **Alt Text**: Always provide meaningful alt text in components

## Usage
Reference images with absolute paths from the public root. Use Next.js Image component for automatic optimization.

## Examples
```tsx
// Using Next.js Image component
import Image from 'next/image'

<Image 
  src="/images/branding/logo.png"
  alt="Scam Checker Logo"
  width={200}
  height={50}
  priority
/>

// For responsive images
<Image
  src="/images/ui/hero-banner.jpg"
  alt="URL Analysis Dashboard"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```