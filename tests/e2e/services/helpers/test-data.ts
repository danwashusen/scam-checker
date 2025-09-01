export interface TestDomain {
  domain: string
  expectedAge?: number // Expected age in days (approximate)
  expectedRegistrar?: string
  expectedCA?: string
  expectedSSLType?: 'DV' | 'OV' | 'EV'
  description: string
}

export interface TestURL {
  url: string
  expectedClean: boolean
  expectedSSL: boolean
  description: string
}

// Stable domains for testing
export const TEST_DOMAINS: Record<string, TestDomain> = {
  // Established, clean domains
  google: {
    domain: 'google.com',
    expectedAge: 9000, // Over 25 years old
    expectedRegistrar: 'MarkMonitor',
    expectedCA: 'Google Trust Services',
    expectedSSLType: 'EV',
    description: 'Google - established, trusted domain'
  },
  
  github: {
    domain: 'github.com',
    expectedAge: 5000, // Over 15 years old
    expectedRegistrar: 'MarkMonitor',
    expectedCA: 'DigiCert',
    expectedSSLType: 'OV',
    description: 'GitHub - developer platform'
  },
  
  wikipedia: {
    domain: 'wikipedia.org',
    expectedAge: 7000, // Over 20 years old
    expectedRegistrar: 'MarkMonitor',
    expectedCA: 'Let\'s Encrypt',
    expectedSSLType: 'DV',
    description: 'Wikipedia - non-profit, trusted'
  },
  
  // Test domains for edge cases
  example: {
    domain: 'example.com',
    expectedAge: 10000, // Very old domain (IANA reserved)
    description: 'IANA reserved example domain'
  },
  
  // Non-existent domain
  nonexistent: {
    domain: 'this-absolutely-does-not-exist-test-12345.com',
    expectedAge: undefined,
    description: 'Non-existent domain for negative testing'
  }
}

// Test URLs with expected results
export const TEST_URLS: Record<string, TestURL> = {
  googleHome: {
    url: 'https://www.google.com',
    expectedClean: true,
    expectedSSL: true,
    description: 'Google homepage - clean and secure'
  },
  
  githubRepo: {
    url: 'https://github.com/facebook/react',
    expectedClean: true,
    expectedSSL: true,
    description: 'GitHub repository - clean and secure'
  },
  
  httpOnly: {
    url: 'http://example.com',
    expectedClean: true,
    expectedSSL: false,
    description: 'HTTP only site - no SSL'
  },
  
  badSSL: {
    url: 'https://self-signed.badssl.com',
    expectedClean: true,
    expectedSSL: false, // Self-signed cert
    description: 'BadSSL test site - certificate issues'
  }
}

// AI analysis test prompts
export const AI_TEST_PROMPTS = {
  legitimate: 'Analyze this legitimate e-commerce URL for potential risks',
  suspicious: 'Analyze this potentially suspicious URL for scam indicators',
  phishing: 'Check if this URL might be a phishing attempt'
}

// Expected response times (milliseconds)
export const EXPECTED_RESPONSE_TIMES = {
  reputation: { min: 100, max: 5000 },
  whois: { min: 500, max: 10000 },
  ai: { min: 500, max: 30000 },
  ssl: { min: 50, max: 5000 }  // SSL can be very fast (50ms-5s range)
}

// Rate limiting delays (milliseconds)
export const RATE_LIMIT_DELAYS = {
  reputation: 1000, // 1 second
  whois: 2000, // 2 seconds
  ai: 3000, // 3 seconds
  ssl: 500 // 0.5 seconds
}
