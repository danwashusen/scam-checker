// Load environment variables from .env.test if it exists
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

// Set longer timeout for E2E tests
jest.setTimeout(60000)

// Global test helpers
interface TestHelpers {
  delay: (ms: number) => Promise<void>
  isCI: () => boolean
  skipIfNoApiKey: (apiKey: string | undefined, serviceName: string) => boolean
  logTestStart: (testName: string) => void
  logTestEnd: (testName: string, duration: number) => void
}

// Global test helpers
;(global as typeof globalThis & { testHelpers: TestHelpers }).testHelpers = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  isCI: () => process.env.CI === 'true',
  
  skipIfNoApiKey: (apiKey: string | undefined, serviceName: string) => {
    if (!apiKey) {
      console.warn(`Skipping ${serviceName} E2E tests - no API key configured`)
      return true
    }
    return false
  },
  
  logTestStart: (testName: string) => {
    console.log(`\n🧪 Starting E2E test: ${testName}`)
    console.log(`   Timestamp: ${new Date().toISOString()}`)
  },
  
  logTestEnd: (testName: string, duration: number) => {
    console.log(`✅ Completed E2E test: ${testName}`)
    console.log(`   Duration: ${duration}ms`)
  }
}

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be within range ${floor} - ${ceiling}`
        : `expected ${received} to be within range ${floor} - ${ceiling}`
    }
  }
})

// Declare global types
declare global {
  const testHelpers: TestHelpers
  
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
    }
  }
}