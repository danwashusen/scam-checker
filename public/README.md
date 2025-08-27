# Static Assets

## Purpose
Static assets served directly by Next.js, including images, icons, and other public files. These assets are accessible at the root URL path.

## Organization
- **images/**: Image assets (logos, screenshots, graphics)
- **icons/**: Icon files (favicon, app icons, etc.)
- **favicon.ico**: Site favicon (when created)

## Conventions
- **Optimization**: All images should be optimized for web delivery
- **Formats**: Use modern formats (WebP, AVIF) with fallbacks
- **Naming**: Use descriptive, kebab-case filenames
- **Sizing**: Provide multiple sizes for responsive images
- **Compression**: Compress all assets to minimize load times

## Usage
Assets in the public directory are served at the root path. Reference them with absolute paths starting with `/`.

## Examples
```tsx
// Reference public assets in components
<img src="/images/logo.png" alt="Scam Checker Logo" />
<link rel="icon" href="/favicon.ico" />

// Next.js Image component with public assets
import Image from 'next/image'
<Image src="/images/hero-image.jpg" alt="Hero" width={800} height={400} />
```