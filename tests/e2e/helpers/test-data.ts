import { TestAnalysisResult, TestUrlData, MockAnalysisResponse, TestUser, TestFixtureData } from '../types/test-types'

/**
 * Test data factory for generating realistic test data
 * Provides consistent, predictable test data for E2E scenarios
 */

export class TestDataFactory {
  
  /**
   * Generate test URLs for different scenarios
   */
  static createTestUrls(): TestUrlData[] {
    return [
      // Safe URLs
      {
        url: 'https://www.google.com',
        expectedRisk: 'low',
        description: 'Major search engine',
        shouldPass: true
      },
      {
        url: 'https://github.com',
        expectedRisk: 'low',
        description: 'Popular development platform',
        shouldPass: true
      },
      {
        url: 'https://stackoverflow.com',
        expectedRisk: 'low',
        description: 'Popular development platform',
        shouldPass: true
      },
      
      // Medium risk URLs
      {
        url: 'https://unknown-domain-test.com',
        expectedRisk: 'medium',
        description: 'Unknown domain',
        shouldPass: true
      },
      {
        url: 'http://insecure-site.com', // HTTP instead of HTTPS
        expectedRisk: 'medium',
        description: 'Non-HTTPS URL',
        shouldPass: true
      },
      
      // High risk URLs
      {
        url: 'https://suspicious-site-123.evil',
        expectedRisk: 'high',
        description: 'Suspicious domain extension',
        shouldPass: true
      },
      {
        url: 'https://suspicious-domain.tk', // .tk domains often suspicious
        expectedRisk: 'high',
        description: 'Suspicious TLD with random words',
        shouldPass: true
      },
      
      // Invalid URLs for validation testing
      {
        url: '',
        expectedRisk: 'low',
        description: 'Empty URL',
        shouldPass: false
      },
      {
        url: 'not-a-url',
        expectedRisk: 'low',
        description: 'Invalid URL format',
        shouldPass: false
      },
      {
        url: 'javascript:alert("xss")',
        expectedRisk: 'low',
        description: 'JavaScript protocol (XSS attempt)',
        shouldPass: false
      },
      {
        url: 'ftp://files.example.com/file.zip',
        expectedRisk: 'low',
        description: 'Non-HTTP protocol',
        shouldPass: false
      },
      {
        url: 'https://' + 'a'.repeat(2000) + '.com',
        expectedRisk: 'low',
        description: 'Extremely long URL',
        shouldPass: false
      }
    ]
  }

  /**
   * Generate test users with different preferences
   */
  static createTestUsers(): TestUser[] {
    return [
      {
        id: 'user-basic-001',
        name: 'Test User',
        email: 'test@example.com',
        preferences: {
          view: 'simple',
          notifications: true
        }
      },
      {
        id: 'user-tech-001',
        name: 'Tech User',
        email: 'tech@example.com',
        preferences: {
          view: 'technical',
          notifications: false
        }
      },
      {
        id: 'user-admin-001',
        name: 'Admin User',
        email: 'admin@example.com',
        preferences: {
          view: 'technical',
          notifications: true
        }
      }
    ]
  }

  /**
   * Generate mock analysis responses
   */
  static createMockAnalysisResponses(): MockAnalysisResponse[] {
    return [
      // Low risk response
      {
        success: true,
        data: {
          url: 'https://www.google.com',
          riskScore: 25,
          riskLevel: 'low',
          factors: [
            {
              type: 'domain_age',
              score: 0.1,
              description: 'Domain registered over 10 years ago'
            },
            {
              type: 'ssl_certificate',
              score: 0.1,
              description: 'Valid SSL certificate from trusted CA'
            },
            {
              type: 'reputation',
              score: 0.0,
              description: 'Excellent reputation across all sources'
            }
          ],
          timestamp: new Date().toISOString(),
          explanation: 'This URL appears to be safe based on our comprehensive analysis.',
          domainAge: {
            ageInDays: 7300,
            registrationDate: new Date(Date.now() - 7300 * 24 * 60 * 60 * 1000).toISOString(),
            registrar: 'GoDaddy'
          },
          sslCertificate: {
            certificateAuthority: 'Let\'s Encrypt'
          },
          reputation: {
            isClean: true
          }
        }
      },
      
      // Medium risk response
      {
        success: true,
        data: {
          url: 'https://unknown-test.com',
          riskScore: 60,
          riskLevel: 'medium',
          factors: [
            {
              type: 'domain_age',
              score: 0.6,
              description: 'Domain registered recently (2 months ago)'
            },
            {
              type: 'ssl_certificate',
              score: 0.3,
              description: 'Valid but self-signed SSL certificate'
            },
            {
              type: 'reputation',
              score: 0.4,
              description: 'Limited reputation data available'
            }
          ],
          timestamp: new Date().toISOString(),
          explanation: 'This URL shows moderate risk factors that warrant caution.',
          domainAge: {
            ageInDays: 60,
            registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            registrar: 'Namecheap'
          },
          sslCertificate: {
            certificateAuthority: 'Self-signed'
          },
          reputation: {
            isClean: true
          }
        }
      },
      
      // High risk response
      {
        success: true,
        data: {
          url: 'https://suspicious-domain.tk',
          riskScore: 85,
          riskLevel: 'high',
          factors: [
            {
              type: 'domain_age',
              score: 0.9,
              description: 'Domain registered less than 7 days ago'
            },
            {
              type: 'ssl_certificate',
              score: 0.8,
              description: 'Invalid SSL certificate'
            },
            {
              type: 'reputation',
              score: 0.9,
              description: 'Reported as malicious by multiple sources'
            }
          ],
          timestamp: new Date().toISOString(),
          explanation: 'This URL shows high risk factors and should be avoided.',
          domainAge: {
            ageInDays: 3,
            registrationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            registrar: 'Unknown'
          },
          sslCertificate: {
            error: 'Certificate validation failed'
          },
          reputation: {
            isClean: false
          }
        }
      }
    ]
  }

  /**
   * Create comprehensive test fixture data
   */
  static createTestFixtures(): TestFixtureData {
    return {
      users: this.createTestUsers(),
      urls: this.createTestUrls(),
      mockResponses: this.createMockAnalysisResponses(),
      errorScenarios: [
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid URL format',
          status: 400
        },
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          status: 429
        },
        {
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: 'Analysis service temporarily unavailable',
          status: 503
        },
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Internal server error',
          status: 500
        }
      ],
      devices: [
        {
          name: 'Desktop Chrome',
          viewport: { width: 1920, height: 1080 },
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false
        },
        {
          name: 'iPhone 12',
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        },
        {
          name: 'iPad Pro',
          viewport: { width: 1024, height: 1366 },
          deviceScaleFactor: 2,
          isMobile: false,
          hasTouch: true,
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      ],
      networkConditions: [
        {
          offline: false,
          downloadThroughput: 1.6 * 1024 * 1024 / 8,
          uploadThroughput: 750 * 1024 / 8,
          latency: 150
        },
        {
          offline: false,
          downloadThroughput: 500 * 1024 / 8,
          uploadThroughput: 500 * 1024 / 8,
          latency: 400
        },
        {
          offline: true,
          downloadThroughput: 0,
          uploadThroughput: 0,
          latency: 0
        }
      ]
    }
  }

  /**
   * Generate random analysis result for testing
   */
  static createRandomAnalysisResult(riskLevel?: 'low' | 'medium' | 'high'): TestAnalysisResult {
    const level = riskLevel || 'medium'
    const scoreRanges = {
      low: 25,
      medium: 60,
      high: 85
    }
    
    return {
      url: 'https://test-site.com',
      riskScore: scoreRanges[level],
      riskLevel: level,
      riskStatus: level === 'low' ? 'safe' : level === 'medium' ? 'caution' : 'danger',
      factors: [
        {
          id: 'test-factor-1',
          type: 'negative',
          severity: level,
          title: 'Domain Age',
          description: 'Test factor description',
          icon: 'alert-triangle'
        }
      ],
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Create test URL with specific characteristics
   */
  static createTestUrl(options: {
    protocol?: 'http' | 'https'
    domain?: string
    tld?: string
    subdomain?: string
    path?: string
    query?: string
    length?: 'short' | 'medium' | 'long' | 'extreme'
  } = {}): string {
    const {
      protocol = 'https',
      domain = 'example',
      tld = 'com',
      subdomain = '',
      path = '',
      query = '',
      length = 'medium'
    } = options

    let baseUrl = `${protocol}://${subdomain ? subdomain + '.' : ''}${domain}.${tld}`
    
    // Add path based on length preference
    if (path || length !== 'short') {
      const pathSegments = length === 'extreme' ? 20 : length === 'long' ? 5 : 2
      const generatedPath = path || '/' + Array.from({ length: pathSegments }, (_, i) => 
        `path${i}`
      ).join('/')
      
      baseUrl += generatedPath
    }
    
    // Add query parameters
    if (query || length === 'long' || length === 'extreme') {
      const queryParams = query || Array.from({ length: length === 'extreme' ? 10 : 3 }, (_, i) => 
        `param${i}=value${i}`
      ).join('&')
      
      baseUrl += `?${queryParams}`
    }
    
    return baseUrl
  }

  /**
   * Create realistic error scenarios
   */
  static createErrorScenarios() {
    return {
      networkTimeout: {
        type: 'timeout',
        message: 'Request timeout after 30 seconds',
        shouldRetry: true
      },
      
      serviceUnavailable: {
        type: 'service_error',
        message: 'Analysis service is temporarily unavailable',
        shouldRetry: true
      },
      
      rateLimitExceeded: {
        type: 'rate_limit',
        message: 'Too many requests. Please try again in 60 seconds.',
        shouldRetry: false
      },
      
      invalidUrl: {
        type: 'validation',
        message: 'Please enter a valid URL starting with http:// or https://',
        shouldRetry: false
      },
      
      malformedResponse: {
        type: 'parsing',
        message: 'Unable to process server response',
        shouldRetry: true
      }
    }
  }

  /**
   * Generate performance test data
   */
  static createPerformanceScenarios() {
    return {
      optimal: {
        name: 'Optimal Performance',
        thresholds: { lcp: 1000, fid: 50, cls: 0.05, ttfb: 200, fcp: 800, bundleSize: 150000 }
      },
      
      acceptable: {
        name: 'Acceptable Performance',
        thresholds: { lcp: 2500, fid: 100, cls: 0.1, ttfb: 600, fcp: 1800, bundleSize: 200000 }
      },
      
      poor: {
        name: 'Poor Performance Threshold',
        thresholds: { lcp: 4000, fid: 300, cls: 0.25, ttfb: 1000, fcp: 3000, bundleSize: 500000 }
      }
    }
  }

  /**
   * Generate unique test data for specific test run
   */
  static createUniqueTestData(testName: string): {
    urls: string[]
    user: TestUser
    timestamp: string
  } {
    return {
      urls: ['https://test1.com', 'https://test2.com', 'https://test3.com'],
      user: this.createTestUsers()[0],
      timestamp: new Date().toISOString()
    }
  }
}

// Export convenience functions
export const testData = {
  // Quick access to common test data
  safeUrls: ['https://www.google.com', 'https://github.com', 'https://stackoverflow.com'],
  riskyUrls: ['http://suspicious-site.tk', 'https://phishing-test.com'],
  invalidUrls: ['', 'not-a-url', 'javascript:alert(1)', 'ftp://file.com/test'],
  
  // Test users
  users: TestDataFactory.createTestUsers(),
  
  // Fixture data
  fixtures: TestDataFactory.createTestFixtures(),
  
  // Generators
  createUrl: TestDataFactory.createTestUrl,
  createResult: TestDataFactory.createRandomAnalysisResult,
  createUser: (overrides?: Partial<TestUser>) => ({
    ...TestDataFactory.createTestUsers()[0],
    ...overrides
  }),
  
  // Utilities
  uniqueData: TestDataFactory.createUniqueTestData
}