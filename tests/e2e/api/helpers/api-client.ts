import { API_TEST_CONFIG } from './test-config'

export interface AnalyzeRequest {
  url: string
  options?: {
    validation?: {
      allowedProtocols?: string[]
      maxLength?: number
      allowPrivateIPs?: boolean
      allowLocalhost?: boolean
    }
    sanitization?: {
      removeTrackingParams?: boolean
      upgradeProtocol?: boolean
      removeFragments?: boolean
      normalizeEncoding?: boolean
      normalizeCase?: boolean
      removeWww?: boolean
      customTrackingParams?: string[]
    }
    skipValidation?: boolean
    skipSanitization?: boolean
  }
}

export interface AnalyzeResponse {
  success: boolean
  data?: {
    url: string
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high'
    riskStatus: 'safe' | 'caution' | 'danger'
    factors: Array<{
      type: string
      score: number
      description: string
    }>
    explanation: string
    timestamp: string
    domainAge?: {
      ageInDays: number | null
      registrationDate: string | null
      registrar: string | null
      fromCache: boolean
      error?: string
    }
    sslCertificate?: {
      certificateType: string | null
      certificateAuthority: string | null
      daysUntilExpiry: number | null
      issuedDate: string | null
      fromCache: boolean
      error?: string
    }
    reputation?: {
      isClean: boolean
      riskLevel: 'low' | 'medium' | 'high'
      threatCount: number
      threatTypes: string[]
      fromCache: boolean
      error?: string
    }
    aiAnalysis?: {
      riskScore: number
      confidence: number
      scamCategory: string
      primaryRisks: string[]
      indicators: string[]
      fromCache: boolean
      error?: string
    }
  }
  error?: string
  message?: string
  details?: Array<{
    field: string
    message: string
    code: string
  }>
  validation?: {
    original: string
    final: string
    wasModified: boolean
    changes: string[]
  }
  timestamp: string
}

export class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>
  private timeout: number
  
  constructor() {
    this.baseUrl = API_TEST_CONFIG.baseUrl
    this.headers = API_TEST_CONFIG.headers
    this.timeout = API_TEST_CONFIG.timeout
  }
  
  /**
   * Analyze a URL using the API
   */
  async analyzeUrl(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const startTime = Date.now()
    
    if (API_TEST_CONFIG.debugMode) {
      console.log(`\n🔍 Analyzing URL: ${request.url}`)
      console.log(`   Endpoint: POST ${this.baseUrl}/api/analyze`)
    }
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      
      const response = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      const duration = Date.now() - startTime
      const data = await response.json() as AnalyzeResponse
      
      if (API_TEST_CONFIG.debugMode) {
        console.log(`   Status: ${response.status}`)
        console.log(`   Duration: ${duration}ms`)
        console.log(`   Success: ${data.success}`)
        
        if (data.data) {
          console.log(`   Risk Score: ${data.data.riskScore}`)
          console.log(`   Risk Level: ${data.data.riskLevel}`)
          console.log(`   Risk Status: ${data.data.riskStatus}`)
          console.log(`   Factors: ${data.data.factors.length}`)
          
          // Log service results
          if (data.data.domainAge) {
            console.log(`   Domain Age: ${data.data.domainAge.ageInDays || 'Unknown'} days`)
          }
          if (data.data.sslCertificate) {
            console.log(`   SSL: ${data.data.sslCertificate.certificateType || 'Unknown'}`)
          }
          if (data.data.reputation) {
            console.log(`   Reputation: ${data.data.reputation.isClean ? 'Clean' : 'Threats detected'}`)
          }
          if (data.data.aiAnalysis) {
            console.log(`   AI Category: ${data.data.aiAnalysis.scamCategory}`)
          }
        }
        
        if (data.error) {
          console.log(`   Error: ${data.error}`)
          console.log(`   Message: ${data.message}`)
        }
      }
      
      return data
    } catch (error) {
      const duration = Date.now() - startTime
      
      if (API_TEST_CONFIG.debugMode) {
        console.log(`   ❌ Request failed after ${duration}ms`)
        console.log(`   Error: ${error}`)
      }
      
      // Handle fetch errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
            message: `Request timed out after ${this.timeout}ms`,
            timestamp: new Date().toISOString(),
          }
        }
        
        return {
          success: false,
          error: 'Network error',
          message: error.message,
          timestamp: new Date().toISOString(),
        }
      }
      
      return {
        success: false,
        error: 'Unknown error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      }
    }
  }
  
  /**
   * Batch analyze multiple URLs
   */
  async analyzeUrls(urls: string[]): Promise<AnalyzeResponse[]> {
    console.log(`\n📊 Batch analyzing ${urls.length} URLs`)
    
    const results: AnalyzeResponse[] = []
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      console.log(`\n[${i + 1}/${urls.length}] Processing: ${url}`)
      
      const result = await this.analyzeUrl({ url })
      results.push(result)
      
      // Rate limiting between requests
      if (i < urls.length - 1) {
        await this.delay(1000) // 1 second between requests
      }
    }
    
    return results
  }
  
  /**
   * Test API connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'GET',
      })
      
      return response.status === 200
    } catch {
      return false
    }
  }
  
  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Helper functions for assertions
export const apiAssertions = {
  /**
   * Validate successful analysis response
   */
  validateSuccessResponse(response: AnalyzeResponse): void {
    expect(response.success).toBe(true)
    expect(response.data).toBeDefined()
    expect(response.timestamp).toBeDefined()
    
    const data = response.data!
    
    // Core fields
    expect(data.url).toBeDefined()
    expect(typeof data.url).toBe('string')
    
    expect(data.riskScore).toHaveValidRiskScore()
    expect(data.riskLevel).toHaveValidRiskLevel()
    expect(data.riskStatus).toHaveValidRiskStatus()
    
    expect(Array.isArray(data.factors)).toBe(true)
    expect(data.explanation).toBeDefined()
    expect(data.timestamp).toBeDefined()
    
    // Validate factors
    data.factors.forEach(factor => {
      expect(factor.type).toBeDefined()
      expect(typeof factor.score).toBe('number')
      expect(factor.description).toBeDefined()
    })
  },
  
  /**
   * Validate error response
   */
  validateErrorResponse(response: AnalyzeResponse): void {
    expect(response.success).toBe(false)
    expect(response.error).toBeDefined()
    expect(response.timestamp).toBeDefined()
  },
  
  /**
   * Validate service data presence
   */
  validateServiceData(response: AnalyzeResponse, services: {
    whois?: boolean
    ssl?: boolean
    reputation?: boolean
    ai?: boolean
  }): void {
    const data = response.data!
    
    if (services.whois) {
      expect(data.domainAge).toBeDefined()
    }
    
    if (services.ssl && data.url.startsWith('https:')) {
      expect(data.sslCertificate).toBeDefined()
    }
    
    if (services.reputation) {
      expect(data.reputation).toBeDefined()
    }
    
    if (services.ai) {
      expect(data.aiAnalysis).toBeDefined()
    }
  },
  
  /**
   * Validate risk score mapping
   */
  validateRiskScoreMapping(response: AnalyzeResponse): void {
    const data = response.data!
    const score = data.riskScore
    const level = data.riskLevel
    const status = data.riskStatus
    
    // Validate score to level mapping
    if (score >= 67) {
      expect(level).toBe('low')
      expect(status).toBe('safe')
    } else if (score >= 34) {
      expect(level).toBe('medium')
      expect(status).toBe('caution')
    } else {
      expect(level).toBe('high')
      expect(status).toBe('danger')
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()