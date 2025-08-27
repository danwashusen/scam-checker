# Integration Tests

## Purpose
Integration tests that verify how different parts of the application work together. Tests feature workflows and component interactions.

## Organization
Tests are organized by feature workflows and user journeys:
- **analysis-flow.test.ts**: Complete URL analysis workflow
- Additional integration test files for major features

## Conventions
- **Feature Focus**: Test complete user workflows end-to-end
- **Real Integrations**: Use actual services where appropriate (with test data)
- **State Management**: Test how components interact through shared state
- **API Integration**: Test frontend-to-backend communication
- **Error Scenarios**: Test error handling across component boundaries

## Usage
Integration tests validate that features work correctly when components are combined, catching issues that unit tests might miss.

## Examples
```typescript
// integration/analysis-flow.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AnalysisPage } from '@/app/page'

test('complete URL analysis workflow', async () => {
  render(<AnalysisPage />)
  
  // User enters URL
  const input = screen.getByPlaceholderText(/enter url/i)
  fireEvent.change(input, { target: { value: 'https://example.com' } })
  
  // User submits analysis
  const button = screen.getByText(/analyze/i)
  fireEvent.click(button)
  
  // Wait for results to appear
  await waitFor(() => {
    expect(screen.getByText(/risk score/i)).toBeInTheDocument()
  })
  
  // Verify analysis results displayed
  expect(screen.getByText(/low risk/i)).toBeInTheDocument()
})
```