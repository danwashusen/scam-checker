import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Performance and accessibility defaults
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Enhanced projects for comprehensive E2E testing */
  projects: [
    // Stubbed tests - fast, deterministic browser flows
    {
      name: 'stubbed',
      testMatch: ['**/user-flows/**/*.spec.ts', '**/user-flows/**/*.e2e.ts', '**/user-flows/**/*.test.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        // Disable animations for stable testing
        reducedMotion: 'reduce',
      },
    },
    
    // Cross-browser testing - stubbed for consistency
    {
      name: 'stubbed-firefox',
      testMatch: ['**/user-flows/**/*.spec.ts'],
      use: { 
        ...devices['Desktop Firefox'],
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'stubbed-safari',
      testMatch: ['**/user-flows/**/*.spec.ts'],
      use: { 
        ...devices['Desktop Safari'],
        reducedMotion: 'reduce',
      },
    },
    
    // Mobile testing - stubbed for consistency
    {
      name: 'mobile-chrome',
      testMatch: ['**/user-flows/**/*.spec.ts'],
      use: { 
        ...devices['Pixel 5'],
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'mobile-safari',
      testMatch: ['**/user-flows/**/*.spec.ts'],
      use: { 
        ...devices['iPhone 12'],
        reducedMotion: 'reduce',
      },
    },
    
    // Tablet testing
    {
      name: 'tablet-chrome',
      testMatch: ['**/user-flows/**/*.spec.ts'],
      use: { 
        ...devices['iPad Pro'],
        reducedMotion: 'reduce',
      },
    },

    // Live-local tests - real API integration
    {
      name: 'live-local',
      testMatch: ['**/live/**/*.spec.ts', '**/live/**/*.e2e.ts', '**/live/**/*.test.ts'],
      use: { 
        ...devices['Desktop Chrome'],
      },
      /* Run serially to avoid state bleed and API limits */
      workers: 1,
    },
    
    // Cross-browser tests - specific compatibility checks
    {
      name: 'cross-browser',
      testMatch: ['**/cross-browser/**/*.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
