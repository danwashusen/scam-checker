# Custom React Hooks

## Purpose
Custom React hooks for state management, side effects, and reusable component logic. Encapsulates common patterns and provides clean APIs for components.

## Organization
- **use-analysis.ts**: URL analysis state and operations
- **use-debounce.ts**: Input debouncing for better UX

## Conventions
- **Naming**: Start with 'use' prefix following React conventions
- **Return Values**: Return objects with named properties
- **Dependencies**: Minimal and clearly defined dependencies
- **Error Handling**: Return error states for components to handle
- **Loading States**: Provide loading indicators for async operations

## Usage
Custom hooks abstract away complex state management and side effects, making components cleaner and more focused on presentation.

## Examples
```typescript
// hooks/use-analysis.ts
export function useAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const analyze = async (url: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url })
      })
      const result = await response.json()
      setResult(result)
    } catch (err) {
      setError('Analysis failed')
    } finally {
      setLoading(false)
    }
  }
  
  return { result, loading, error, analyze }
}

// Usage in component
const { result, loading, analyze } = useAnalysis()
```