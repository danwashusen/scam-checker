export const TEST_URLS = {
  // Known clean, established sites
  clean: {
    google: {
      url: 'https://www.google.com',
      expectedRiskLevel: 'low',
      expectedRiskStatus: 'safe',
      description: 'Google - established, trusted domain',
    },
    github: {
      url: 'https://github.com',
      expectedRiskLevel: 'low',
      expectedRiskStatus: 'safe',
      description: 'GitHub - developer platform',
    },
    wikipedia: {
      url: 'https://www.wikipedia.org',
      expectedRiskLevel: 'low',
      expectedRiskStatus: 'safe',
      description: 'Wikipedia - non-profit, educational',
    },
  },
  
  // Potentially suspicious patterns
  suspicious: {
    ipAddress: {
      url: 'http://192.168.1.1',
      expectedRiskLevel: 'medium',
      description: 'Private IP address',
    },
    typosquatting: {
      url: 'https://g00gle.com',
      expectedRiskLevel: 'medium',
      description: 'Potential typosquatting',
    },
    httpOnly: {
      url: 'http://example.com',
      expectedRiskLevel: 'medium',
      description: 'Non-HTTPS site',
    },
    shortener: {
      url: 'https://bit.ly/test123',
      expectedRiskLevel: 'medium',
      description: 'URL shortener',
    },
  },
  
  // Invalid URLs for error testing
  invalid: {
    notAUrl: {
      url: 'not-a-url',
      description: 'Not a valid URL',
    },
    empty: {
      url: '',
      description: 'Empty string',
    },
    javascript: {
      url: 'javascript:alert(1)',
      description: 'JavaScript protocol',
    },
    ftp: {
      url: 'ftp://files.example.com',
      description: 'FTP protocol',
    },
  },
}

// Performance expectations
export const PERFORMANCE_THRESHOLDS = {
  // Response time thresholds in milliseconds
  fast: 5000,    // Under 5 seconds is fast
  normal: 15000, // Under 15 seconds is normal
  slow: 30000,   // Under 30 seconds is slow but acceptable
  timeout: 60000, // Over 60 seconds is timeout
}

// Expected service availability
export const SERVICE_EXPECTATIONS = {
  // Services that should always be available
  alwaysAvailable: ['whois', 'ssl'],
  
  // Services that require API keys
  requiresApiKey: {
    reputation: 'GOOGLE_SAFE_BROWSING_API_KEY',
    ai: 'OPENAI_API_KEY',
  },
}

// Test scenarios for comprehensive testing
export const TEST_SCENARIOS = [
  {
    name: 'Clean established domain',
    url: 'https://www.google.com',
    expectations: {
      success: true,
      riskLevel: 'low',
      riskStatus: 'safe',
      domainAge: { minDays: 8000 }, // Google is very old
      ssl: { valid: true, type: 'EV' },
      reputation: { isClean: true },
    },
  },
  {
    name: 'New domain (if available)',
    url: process.env.TEST_NEW_DOMAIN || 'https://example-new-domain-2024.com',
    expectations: {
      success: true,
      riskLevel: 'medium', // New domains are medium risk
      domainAge: { maxDays: 365 },
    },
  },
  {
    name: 'HTTP only site',
    url: 'http://example.com',
    expectations: {
      success: true,
      ssl: { available: false },
      factors: {
        shouldInclude: ['protocol'], // Should flag HTTP
      },
    },
  },
  {
    name: 'IP address URL',
    url: 'http://93.184.216.34', // example.com IP
    expectations: {
      success: true,
      factors: {
        shouldInclude: ['domain'], // Should flag IP usage
      },
    },
  },
]

// Helper to get custom test URL if provided
export function getCustomTestUrl(): string | undefined {
  return process.env.TEST_URL
}

// Helper to get debug-friendly test URLs
export function getDebugTestUrls(): string[] {
  const urls: string[] = []
  
  // Add custom URL first if provided
  const customUrl = getCustomTestUrl()
  if (customUrl) {
    urls.push(customUrl)
    return urls // Only test custom URL in debug mode
  }
  
  // Otherwise use standard test set
  urls.push(
    TEST_URLS.clean.google.url,
    TEST_URLS.clean.github.url,
    TEST_URLS.suspicious.httpOnly.url,
  )
  
  return urls
}