# Type Definitions

## Purpose
Centralized TypeScript type definitions shared across the entire application. Ensures type safety and consistency between frontend, backend, and shared utilities.

## Organization
- **analysis.ts**: Types related to URL analysis and risk assessment
- **api.ts**: API request and response types
- **ui.ts**: UI component prop types and form schemas

## Conventions
- **Naming**: PascalCase for interfaces, camelCase for type unions
- **Exports**: Export all types for easy importing
- **Documentation**: JSDoc comments for complex types
- **Validation**: Pair with Zod schemas where possible
- **Composition**: Use type composition over duplication

## Usage
Import types throughout the application to ensure consistency. These types serve as the contract between different layers of the application.

## Examples
```typescript
// types/analysis.ts
export interface AnalysisResult {
  url: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  factors: RiskFactor[]
  explanation: string
  timestamp: Date
}

export interface RiskFactor {
  type: 'whois' | 'ssl' | 'reputation' | 'content'
  score: number
  description: string
  details?: Record<string, any>
}

// types/api.ts
export interface AnalyzeUrlRequest {
  url: string
}

export interface AnalyzeUrlResponse {
  success: boolean
  data?: AnalysisResult
  error?: string
}
```