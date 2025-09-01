// Load environment variables from .env.test if it exists
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Set longer timeout for E2E tests
jest.setTimeout(60000)

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
  },
  
  toHaveValidRiskScore(received: number) {
    const pass = received >= 0 && received <= 100
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid risk score (0-100)`
        : `expected ${received} to be a valid risk score (0-100)`
    }
  },
  
  toHaveValidRiskLevel(received: string) {
    const validLevels = ['low', 'medium', 'high']
    const pass = validLevels.includes(received)
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid risk level`
        : `expected ${received} to be a valid risk level (low|medium|high)`
    }
  },
  
  toHaveValidRiskStatus(received: string) {
    const validStatuses = ['safe', 'caution', 'danger']
    const pass = validStatuses.includes(received)
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid risk status`
        : `expected ${received} to be a valid risk status (safe|caution|danger)`
    }
  }
})

// Declare global types
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
      toHaveValidRiskScore(): R
      toHaveValidRiskLevel(): R
      toHaveValidRiskStatus(): R
    }
  }
}