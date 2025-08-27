# API Routes

## Purpose
Server-side API endpoints using Next.js App Router API routes. Handles backend functionality like URL analysis, external API integration, and data processing.

## Organization
- **analyze/**: URL analysis endpoints
- **route.ts**: API route handler files using App Router conventions

## Conventions
- **File Naming**: Use `route.ts` for API endpoints
- **HTTP Methods**: Export named functions (GET, POST, PUT, DELETE)
- **Request/Response**: Use Next.js Request/Response objects
- **Error Handling**: Consistent error response format
- **Validation**: Always validate request data with Zod schemas

## Usage
API routes handle server-side logic and external integrations. Keep business logic in `src/lib/` and import into routes.

## Examples
```typescript
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzeUrl } from '@/lib/analysis/scoring'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    const result = await analyzeUrl(url)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
```