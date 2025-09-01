export interface ApiTestConfig {
  baseUrl: string
  timeout: number
  headers: Record<string, string>
  testUrls: {
    clean: string[]
    suspicious: string[]
    invalid: string[]
    custom?: string  // From TEST_URL env var
  }
  expectedResponseTimes: {
    min: number
    max: number
  }
  debugMode: boolean
  skipServices: string[]
}

// Load configuration from environment
export const API_TEST_CONFIG: ApiTestConfig = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  timeout: 60000, // 60 seconds for complete analysis
  headers: {
    'Content-Type': 'application/json',
  },
  testUrls: {
    clean: [
      'https://www.google.com',
      'https://github.com',
      'https://www.wikipedia.org',
    ],
    suspicious: [
      'http://definitely-not-google.com',
      'https://g00gle.com',
      'http://192.168.1.1/admin',
      'https://bit.ly/test123',
    ],
    invalid: [
      'not-a-url',
      'ftp://invalid-protocol.com',
      'javascript:alert(1)',
      '',
    ],
    custom: process.env.TEST_URL,
  },
  expectedResponseTimes: {
    min: 1000,  // At least 1 second (multiple services)
    max: 30000, // Max 30 seconds
  },
  debugMode: process.env.DEBUG_E2E === 'true',
  skipServices: process.env.SKIP_SERVICES?.split(',') || [],
}

// Helper to check if API keys are configured
export function getConfiguredServices(): {
  whois: boolean
  ssl: boolean
  reputation: boolean
  ai: boolean
} {
  return {
    whois: true, // Always available
    ssl: true,   // Always available
    reputation: !!process.env.GOOGLE_SAFE_BROWSING_API_KEY,
    ai: !!process.env.OPENAI_API_KEY,
  }
}

// Get test URLs based on configuration
export function getTestUrls(): string[] {
  const urls: string[] = []
  
  // Add custom URL if provided
  if (API_TEST_CONFIG.testUrls.custom) {
    urls.push(API_TEST_CONFIG.testUrls.custom)
  }
  
  // Add default test URLs
  urls.push(...API_TEST_CONFIG.testUrls.clean)
  
  return urls
}

// Log configuration if in debug mode
export function logConfiguration(): void {
  if (API_TEST_CONFIG.debugMode) {
    console.log('🔧 API E2E Test Configuration:')
    console.log(`   Base URL: ${API_TEST_CONFIG.baseUrl}`)
    console.log(`   Debug Mode: ${API_TEST_CONFIG.debugMode}`)
    console.log(`   Custom Test URL: ${API_TEST_CONFIG.testUrls.custom || 'Not set'}`)
    
    const services = getConfiguredServices()
    console.log('   Configured Services:')
    console.log(`     - WHOIS: ✅`)
    console.log(`     - SSL: ✅`)
    console.log(`     - Reputation: ${services.reputation ? '✅' : '❌ (No API key)'}`)
    console.log(`     - AI: ${services.ai ? '✅' : '❌ (No API key)'}`)
    
    if (API_TEST_CONFIG.skipServices.length > 0) {
      console.log(`   Skipped Services: ${API_TEST_CONFIG.skipServices.join(', ')}`)
    }
  }
}