import { AnalysisResult } from '@/types/analysis-display'

/**
 * Utility function to create mock analysis results for testing purposes.
 * This should only be used in test files and development environments.
 */
export const createMockAnalysisResult = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => {
  const mockResult: AnalysisResult = {
    url: 'https://example.com',
    score: 85,
    status: 'safe',
    confidence: 0.92,
    timestamp: new Date('2024-01-15T10:00:00Z'), // Fixed date for consistent testing
    findings: [
      {
        id: '1',
        type: 'positive',
        severity: 'low',
        title: 'Valid SSL Certificate',
        description: 'The website has a valid SSL certificate from a trusted authority',
        icon: 'ssl'
      },
      {
        id: '2', 
        type: 'positive',
        severity: 'low',
        title: 'Established Domain',
        description: 'Domain has been registered for over 5 years',
        icon: 'domain'
      },
      {
        id: '3',
        type: 'neutral',
        severity: 'low',
        title: 'Limited Reputation Data',
        description: 'Some security sources have limited information about this domain',
        icon: 'reputation'
      }
    ],
    technicalData: {
      domainAge: {
        ageInDays: 1825,
        registrationDate: new Date('2020-01-01T00:00:00Z'),
        expirationDate: new Date('2025-01-01T00:00:00Z'),
        registrar: 'Example Registrar Inc.'
      },
      ssl: {
        isValid: true,
        issuer: 'Let\'s Encrypt Authority X3',
        validFrom: new Date('2024-01-01T00:00:00Z'),
        validTo: new Date('2024-04-01T00:00:00Z'),
        algorithm: 'RSA-256',
        keySize: 2048
      },
      reputation: {
        sources: [
          {
            name: 'VirusTotal',
            score: 90,
            category: 'Antivirus',
            lastUpdated: new Date('2024-01-15T00:00:00Z')
          },
          {
            name: 'Google Safe Browsing',
            score: 85,
            category: 'Web Safety',
            lastUpdated: new Date('2024-01-14T00:00:00Z')
          }
        ],
        overallRating: 'safe',
        lastChecked: new Date('2024-01-15T00:00:00Z')
      },
      ai: {
        contentScore: 80,
        patterns: [
          {
            type: 'Legitimate Business',
            confidence: 0.85,
            description: 'Content appears to be from a legitimate business website',
            severity: 'low'
          }
        ],
        confidence: 0.88,
        flags: ['clean-content', 'business-website'],
        summary: 'The website appears to be legitimate with no obvious signs of malicious intent.'
      },
      raw: {
        analysisVersion: '1.0.0',
        processingTime: 2.34,
        additionalMetrics: {}
      }
    }
  }

  return { ...mockResult, ...overrides }
}

/**
 * Create mock data for different risk scenarios
 */
export const mockScenarios = {
  safe: () => createMockAnalysisResult({
    score: 90,
    status: 'safe',
    confidence: 0.95
  }),
  
  moderate: () => createMockAnalysisResult({
    score: 65,
    status: 'moderate',
    confidence: 0.78,
    findings: [
      {
        id: '1',
        type: 'neutral',
        severity: 'medium',
        title: 'Recent Domain Registration',
        description: 'Domain was registered recently (within last 6 months)',
        icon: 'domain'
      },
      {
        id: '2',
        type: 'positive',
        severity: 'low',
        title: 'Valid SSL Certificate',
        description: 'SSL certificate is valid and properly configured',
        icon: 'ssl'
      }
    ]
  }),
  
  danger: () => createMockAnalysisResult({
    score: 15,
    status: 'danger',
    confidence: 0.92,
    findings: [
      {
        id: '1',
        type: 'negative',
        severity: 'high',
        title: 'Suspicious Content Detected',
        description: 'Content contains patterns commonly associated with phishing attempts',
        icon: 'security'
      },
      {
        id: '2',
        type: 'negative',
        severity: 'high',
        title: 'Domain Reputation Issues',
        description: 'Multiple security services have flagged this domain',
        icon: 'reputation'
      }
    ]
  }),

  loading: () => null, // For loading states
  
  error: () => { throw new Error('Mock analysis error for testing') }
}

/**
 * Mock data for partial results (useful for testing progressive loading)
 */
export const createPartialMockResult = (): Partial<AnalysisResult> => ({
  url: 'https://example.com',
  score: undefined, // Not yet calculated
  findings: [
    {
      id: '1',
      type: 'positive',
      severity: 'low',
      title: 'SSL Certificate Valid',
      description: 'Initial SSL check passed',
      icon: 'ssl'
    }
  ]
  // Missing technicalData, status, etc. for partial loading simulation
})