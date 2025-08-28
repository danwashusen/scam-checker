import { RATE_LIMIT_DELAYS } from './test-data'

export class E2ETestHelper {
  private lastApiCall: Map<string, number> = new Map()
  
  /**
   * Enforce rate limiting between API calls
   */
  async enforceRateLimit(service: keyof typeof RATE_LIMIT_DELAYS): Promise<void> {
    const now = Date.now()
    const lastCall = this.lastApiCall.get(service) || 0
    const requiredDelay = RATE_LIMIT_DELAYS[service]
    const elapsed = now - lastCall
    
    if (elapsed < requiredDelay) {
      const waitTime = requiredDelay - elapsed
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before next ${service} call`)
      await this.delay(waitTime)
    }
    
    this.lastApiCall.set(service, Date.now())
  }
  
  /**
   * Delay helper
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * Measure execution time
   */
  async measureTime<T>(
    fn: () => Promise<T>, 
    label: string
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now()
    console.log(`⏱️  Starting: ${label}`)
    
    try {
      const result = await fn()
      const duration = Date.now() - start
      console.log(`✅ Completed: ${label} (${duration}ms)`)
      return { result, duration }
    } catch (error) {
      const duration = Date.now() - start
      console.log(`❌ Failed: ${label} (${duration}ms)`)
      throw error
    }
  }
  
  /**
   * Validate API response structure
   */
  validateResponseStructure(
    response: unknown,
    requiredFields: string[],
    serviceName: string
  ): void {
    if (typeof response !== 'object' || response === null) {
      throw new Error(`${serviceName} response is not a valid object`)
    }
    requiredFields.forEach(field => {
      if (!(field in response)) {
        throw new Error(`${serviceName} response missing required field: ${field}`)
      }
    })
  }
  
  /**
   * Check if error is retryable
   */
  isRetryableError(error: unknown): boolean {
    const err = error as { message?: string; code?: string }
    const message = err.message?.toLowerCase() || ''
    const code = err.code?.toLowerCase() || ''
    
    const retryablePatterns = [
      'timeout',
      'econnreset',
      'econnrefused',
      'socket hang up',
      'network',
      'rate limit',
      'too many requests',
      '429',
      '503',
      '504'
    ]
    
    return retryablePatterns.some(pattern => 
      message.includes(pattern) || code.includes(pattern)
    )
  }
  
  /**
   * Classify error type
   */
  classifyError(error: unknown): string {
    const err = error as { message?: string; code?: string; response?: { status?: number } }
    const message = err.message?.toLowerCase() || ''
    const code = err.code || err.response?.status || ''
    
    if (code === 401 || message.includes('unauthorized') || message.includes('api key')) {
      return 'AUTH_ERROR'
    }
    if (code === 429 || message.includes('rate limit') || message.includes('too many')) {
      return 'RATE_LIMIT'
    }
    if (code === 404 || message.includes('not found')) {
      return 'NOT_FOUND'
    }
    if (message.includes('timeout') || code === 'ETIMEDOUT') {
      return 'TIMEOUT'
    }
    if (message.includes('network') || code === 'ECONNREFUSED') {
      return 'NETWORK_ERROR'
    }
    
    return 'UNKNOWN_ERROR'
  }
  
  /**
   * Log test context
   */
  logContext(context: Record<string, unknown>): void {
    console.log('\n📋 Test Context:')
    Object.entries(context).forEach(([key, value]) => {
      console.log(`   ${key}: ${JSON.stringify(value)}`)
    })
  }
}

// Singleton instance
export const testHelper = new E2ETestHelper()

// Assertion helpers
export const assertions = {
  assertValidUrl(url: string): void {
    expect(url).toBeTruthy()
    expect(url).toMatch(/^https?:\/\/.+/)
  },
  
  assertValidDomain(domain: string): void {
    expect(domain).toBeTruthy()
    expect(domain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
  },
  
  assertValidTimestamp(timestamp: unknown): void {
    const date = new Date(timestamp as string | number | Date)
    expect(date.getTime()).toBeGreaterThan(0)
    expect(date.getTime()).toBeLessThanOrEqual(Date.now())
  },

  assertValidIssuedDate(timestamp: unknown): void {
    const date = new Date(timestamp as string | number | Date)
    expect(date.getTime()).toBeGreaterThan(0)
    expect(date.getTime()).toBeLessThanOrEqual(Date.now())
  },

  assertValidExpirationDate(timestamp: unknown): void {
    const date = new Date(timestamp as string | number | Date)
    expect(date.getTime()).toBeGreaterThan(0)
    // Expiration dates can be in the future (and should be for valid certificates)
    // Just check it's not unreasonably far in the future (10 years max)
    const tenYearsFromNow = Date.now() + (10 * 365 * 24 * 60 * 60 * 1000)
    expect(date.getTime()).toBeLessThanOrEqual(tenYearsFromNow)
  },
  
  assertValidScore(score: number, min = 0, max = 100): void {
    expect(score).toBeGreaterThanOrEqual(min)
    expect(score).toBeLessThanOrEqual(max)
  },
  
  assertValidConfidence(confidence: number): void {
    expect(confidence).toBeGreaterThanOrEqual(0)
    expect(confidence).toBeLessThanOrEqual(1)
  }
}