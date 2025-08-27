# App Router Structure

## Purpose
Contains Next.js 15 App Router pages, layouts, and routing configuration. Follows the latest App Router conventions for file-based routing and server components.

## Organization
- **page.tsx**: Route page components
- **layout.tsx**: Layout components that wrap pages
- **loading.tsx**: Loading UI components
- **error.tsx**: Error boundary components
- **api/**: API route handlers for server-side endpoints

## Conventions
- **File Naming**: Use Next.js reserved filenames (page.tsx, layout.tsx, etc.)
- **Components**: Server Components by default, Client Components marked with 'use client'
- **Metadata**: Define metadata in layout.tsx files
- **Route Groups**: Use (groupName) for organization without affecting URLs

## Usage
- Pages automatically become routes based on folder structure
- Layouts wrap all pages in their segment and below
- API routes handle backend functionality

## Examples
```typescript
// app/page.tsx - Home page
export default function HomePage() {
  return <div>Welcome to Scam Checker</div>
}

// app/layout.tsx - Root layout
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```