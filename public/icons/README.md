# Icon Assets

## Purpose
Icon files for the application including favicons, app icons, and other iconography used in the user interface and browser/device integration.

## Organization
- **favicon.ico**: Standard favicon for browsers
- **app-icons/**: Progressive Web App icons in various sizes
- **ui-icons/**: Custom UI icons (if not using icon library)

## Conventions
- **Favicon Sizes**: Provide multiple sizes (16x16, 32x32, 48x48, etc.)
- **PWA Icons**: Include sizes from 72x72 up to 512x512 for Progressive Web App support
- **Format**: Use ICO for favicon, PNG for app icons
- **Naming**: Clear size indicators in filenames
- **Optimization**: Optimize all icons for smallest file size

## Usage
Icons are automatically detected by browsers and devices when properly named and placed. Reference in HTML meta tags or manifest files.

## Examples
```html
<!-- In app/layout.tsx or _document.tsx -->
<link rel="icon" href="/icons/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />

<!-- PWA manifest.json -->
{
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```