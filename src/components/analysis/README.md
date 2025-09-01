# Analysis Components

## Purpose
Components specific to URL analysis functionality. These handle the user interface for URL input, risk assessment display, and analysis results presentation.

## Organization
Each component handles a specific part of the analysis workflow:
- **url-input-form.tsx**: URL input and validation
- **risk-display.tsx**: Risk score and level visualization
- **technical-details.tsx**: Technical analysis details

## Conventions
- **Business Logic**: Use custom hooks for analysis state management
- **Validation**: Client-side validation with server-side confirmation
- **Loading States**: Show loading indicators during analysis
- **Error Handling**: Display user-friendly error messages
- **Responsive**: Mobile-first responsive design

## Usage
These components work together to create the complete URL analysis experience. They integrate with the analysis API and display results to users.

## Examples
```typescript
// analysis/url-input-form.tsx
import { useAnalysis } from '@/hooks/use-analysis'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function UrlInputForm() {
  const { analyze, loading } = useAnalysis()
  
  return (
    <form onSubmit={handleSubmit}>
      <Input placeholder="Enter URL to analyze..." />
      <Button loading={loading}>Analyze URL</Button>
    </form>
  )
}
```