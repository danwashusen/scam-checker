# End-to-End Tests

## Purpose
End-to-end tests using Playwright that verify complete user workflows in a real browser environment. Tests the entire application from user perspective.

## Organization
- **analysis-workflow.cy.ts**: Complete user analysis workflow
- Additional e2e test files for major user journeys

## Conventions
- **User Perspective**: Test from the user's point of view
- **Real Browser**: Run in actual browser environments
- **Visual Testing**: Include visual regression testing where appropriate
- **Cross-Browser**: Test across different browsers and devices
- **Performance**: Monitor performance during e2e tests

## Usage
E2E tests run less frequently (typically in CI/CD) and provide confidence that the entire application works correctly for real users.

## Examples
```typescript
// e2e/analysis-workflow.cy.ts
describe('URL Analysis Workflow', () => {
  test('user can analyze a URL and see results', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
    
    // User sees the analysis form
    await expect(page.getByText('Scam Checker')).toBeVisible()
    
    // User enters a URL
    await page.fill('input[placeholder*="Enter URL"]', 'https://example.com')
    
    // User clicks analyze button
    await page.click('button:has-text("Analyze")')
    
    // User sees loading state
    await expect(page.getByText('Analyzing...')).toBeVisible()
    
    // User sees analysis results
    await expect(page.getByText('Risk Score')).toBeVisible()
    await expect(page.getByText('Low Risk')).toBeVisible()
    
    // User can see technical details
    await page.click('button:has-text("View Details")')
    await expect(page.getByText('WHOIS Information')).toBeVisible()
  })
})
```