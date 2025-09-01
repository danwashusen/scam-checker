export interface E2EServiceConfig {
  apiKey?: string
  timeout: number
  retryDelay: number
  testDomains: Record<string, string>
  testUrls: Record<string, string>
}

export interface E2ETestConfig {
  reputation: E2EServiceConfig & {
    apiEndpoint: string
  }
  whois: E2EServiceConfig
  ai: E2EServiceConfig & {
    model: string
    maxTokens: number
  }
  ssl: E2EServiceConfig & {
    testPorts: Record<string, number>
  }
}

// Load configuration from environment with defaults
export const E2E_TEST_CONFIG: E2ETestConfig = {
  reputation: {
    apiKey: process.env.GOOGLE_SAFE_BROWSING_TEST_API_KEY || process.env.GOOGLE_SAFE_BROWSING_API_KEY,
    apiEndpoint: 'https://safebrowsing.googleapis.com/v4',
    timeout: 30000,
    retryDelay: 2000, // 2 seconds between retries
    testDomains: {
      clean: 'google.com',
      cleanAlternative: 'github.com',
      cleanNews: 'bbc.com'
    },
    testUrls: {
      clean: 'https://google.com',
      cleanWithPath: 'https://github.com/anthropics/claude-code',
      cleanWithQuery: 'https://www.google.com/search?q=test',
      // Note: We cannot test with actual malicious URLs for safety
      // These would need to be sourced from Google's test URLs if available
      testMalicious: 'http://testsafebrowsing.appspot.com/s/malware.html',
      testPhishing: 'http://testsafebrowsing.appspot.com/s/phishing.html'
    }
  },
  
  whois: {
    apiKey: undefined, // WHOIS doesn't need API key
    timeout: 30000,
    retryDelay: 3000, // 3 seconds for WHOIS (rate limited)
    testDomains: {
      established: 'google.com', // Very old domain
      newer: 'anthropic.com', // Newer but legitimate
      invalid: 'this-domain-definitely-does-not-exist-12345.com',
      tld: 'example.org', // Different TLD
      subdomain: 'www.github.com' // Should extract to github.com
    },
    testUrls: {
      withProtocol: 'https://google.com',
      withPath: 'https://github.com/some/path',
      withPort: 'https://example.com:8080'
    }
  },
  
  ai: {
    apiKey: process.env.OPENAI_TEST_API_KEY || process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo', // Use cheaper model for tests
    maxTokens: 500,
    timeout: 60000, // AI can be slower
    retryDelay: 5000, // 5 seconds for AI rate limits
    testDomains: {
      legitimate: 'amazon.com',
      news: 'cnn.com',
      tech: 'stackoverflow.com'
    },
    testUrls: {
      legitimate: 'https://www.amazon.com',
      ecommerce: 'https://www.amazon.com/dp/B08N5WRWNW',
      news: 'https://www.cnn.com/2024/01/01/test-article',
      suspicious: 'https://definitely-not-amazon.com/get-free-money',
      shortened: 'https://bit.ly/test123'
    }
  },
  
  ssl: {
    apiKey: undefined, // SSL doesn't need API key
    timeout: 30000,
    retryDelay: 1000, // 1 second for SSL
    testDomains: {
      valid: 'google.com',
      validEV: 'github.com', // Extended validation cert
      expired: 'expired.badssl.com',
      selfSigned: 'self-signed.badssl.com',
      wrongHost: 'wrong.host.badssl.com',
      untrusted: 'untrusted-root.badssl.com',
      revoked: 'revoked.badssl.com',
      noSubject: 'no-subject.badssl.com',
      incomplete: 'incomplete-chain.badssl.com'
    },
    testUrls: {
      https: 'https://google.com',
      http: 'http://example.com', // Should fail - no SSL
    },
    testPorts: {
      standard: 443,
      alternative: 8443,
      invalid: 12345
    }
  }
}

// Helper to check if service is configured
export function isServiceConfigured(service: keyof E2ETestConfig): boolean {
  const config = E2E_TEST_CONFIG[service]
  
  switch(service) {
    case 'reputation':
      return !!config.apiKey
    case 'ai':
      return !!config.apiKey
    case 'whois':
    case 'ssl':
      return true // These don't need API keys
    default:
      return false
  }
}

// Get delay between API calls
export function getApiDelay(service: keyof E2ETestConfig): number {
  return E2E_TEST_CONFIG[service].retryDelay
}
