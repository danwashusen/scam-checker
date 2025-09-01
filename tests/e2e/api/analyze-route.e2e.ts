import { apiClient, apiAssertions } from './helpers/api-client'
import { API_TEST_CONFIG, getConfiguredServices, logConfiguration } from './helpers/test-config'
import { TEST_URLS, PERFORMANCE_THRESHOLDS, getCustomTestUrl, getDebugTestUrls } from './helpers/test-data'

describe('/api/analyze E2E Tests', () => {
  const configuredServices = getConfiguredServices()
  
  beforeAll(() => {
    console.log('\n🚀 Starting /api/analyze E2E Tests')
    console.log(`   Base URL: ${API_TEST_CONFIG.baseUrl}`)
    console.log(`   Debug Mode: ${API_TEST_CONFIG.debugMode}`)
    
    // Log configuration in debug mode
    logConfiguration()
    
    // Check for custom test URL
    const customUrl = getCustomTestUrl()
    if (customUrl) {
      console.log(`\n📍 Custom Test URL: ${customUrl}`)
    }
  })
  
  describe('API Connectivity', () => {
    test('should connect to the analyze endpoint', async () => {
      const isConnected = await apiClient.testConnectivity()
      
      if (!isConnected) {
        console.warn('⚠️  Cannot connect to API. Is the dev server running?')
        console.warn(`   Try running: npm run dev`)
        console.warn(`   API URL: ${API_TEST_CONFIG.baseUrl}/api/analyze`)
      }
      
      expect(isConnected).toBe(true)
    })
    
    test('should return proper error for missing URL', async () => {
      const response = await apiClient.analyzeUrl({ url: '' })
      
      apiAssertions.validateErrorResponse(response)
      expect(response.error).toBeDefined()
      expect(response.success).toBe(false)
    })
    
    test('should return proper error for invalid URL', async () => {
      const response = await apiClient.analyzeUrl({ url: 'not-a-url' })
      
      apiAssertions.validateErrorResponse(response)
      expect(response.error).toBeDefined()
      expect(response.message).toContain('URL')
    })
  })
  
  describe('Complete URL Analysis', () => {
    // Test custom URL if provided
    if (getCustomTestUrl()) {
      test('should analyze custom test URL', async () => {
        const url = getCustomTestUrl()!
        console.log(`\n🔍 Testing custom URL: ${url}`)
        
        const startTime = Date.now()
        const response = await apiClient.analyzeUrl({ url })
        const duration = Date.now() - startTime
        
        // Basic validation
        expect(response.success).toBe(true)
        apiAssertions.validateSuccessResponse(response)
        
        // Log results
        if (response.data) {
          console.log('\n📊 Analysis Results:')
          console.log(`   URL: ${response.data.url}`)
          console.log(`   Risk Score: ${response.data.riskScore}/100`)
          console.log(`   Risk Level: ${response.data.riskLevel}`)
          console.log(`   Risk Status: ${response.data.riskStatus}`)
          console.log(`   Processing Time: ${duration}ms`)
          console.log(`   Factors: ${response.data.factors.length}`)
          
          // Log service results
          if (response.data.domainAge) {
            const age = response.data.domainAge.ageInDays
            console.log(`\n   Domain Age: ${age ? `${age} days` : 'Unknown'}`)
            if (response.data.domainAge.registrar) {
              console.log(`   Registrar: ${response.data.domainAge.registrar}`)
            }
          }
          
          if (response.data.sslCertificate) {
            console.log(`\n   SSL Certificate: ${response.data.sslCertificate.certificateType || 'Unknown'}`)
            if (response.data.sslCertificate.certificateAuthority) {
              console.log(`   CA: ${response.data.sslCertificate.certificateAuthority}`)
            }
            if (response.data.sslCertificate.daysUntilExpiry !== null) {
              console.log(`   Days Until Expiry: ${response.data.sslCertificate.daysUntilExpiry}`)
            }
          }
          
          if (response.data.reputation) {
            console.log(`\n   Reputation: ${response.data.reputation.isClean ? 'Clean' : 'Threats Detected'}`)
            if (response.data.reputation.threatCount > 0) {
              console.log(`   Threat Types: ${response.data.reputation.threatTypes.join(', ')}`)
            }
          }
          
          if (response.data.aiAnalysis) {
            console.log(`\n   AI Analysis: ${response.data.aiAnalysis.scamCategory}`)
            console.log(`   AI Confidence: ${response.data.aiAnalysis.confidence}%`)
            if (response.data.aiAnalysis.primaryRisks.length > 0) {
              console.log(`   Primary Risks: ${response.data.aiAnalysis.primaryRisks.join(', ')}`)
            }
          }
          
          // Log top risk factors
          console.log('\n   Top Risk Factors:')
          const topFactors = response.data.factors
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
          
          topFactors.forEach(factor => {
            console.log(`     - ${factor.type}: ${factor.score.toFixed(2)} - ${factor.description}`)
          })
        }
      })
    }
    
    test('should analyze clean URL (google.com)', async () => {
      const testCase = TEST_URLS.clean.google
      console.log(`\n📋 Testing: ${testCase.description}`)
      
      const startTime = Date.now()
      const response = await apiClient.analyzeUrl({ url: testCase.url })
      const duration = Date.now() - startTime
      
      // Validate response
      expect(response.success).toBe(true)
      apiAssertions.validateSuccessResponse(response)
      apiAssertions.validateRiskScoreMapping(response)
      
      // Check expected risk level
      expect(response.data?.riskLevel).toBe(testCase.expectedRiskLevel)
      expect(response.data?.riskStatus).toBe(testCase.expectedRiskStatus)
      
      // Check performance
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.normal)
      
      // Validate service data presence
      apiAssertions.validateServiceData(response, configuredServices)
      
      console.log(`   ✅ Risk Level: ${response.data?.riskLevel} (expected: ${testCase.expectedRiskLevel})`)
      console.log(`   ✅ Risk Score: ${response.data?.riskScore}/100`)
      console.log(`   ✅ Processing Time: ${duration}ms`)
    })
    
    test('should analyze GitHub URL', async () => {
      const testCase = TEST_URLS.clean.github
      console.log(`\n📋 Testing: ${testCase.description}`)
      
      const response = await apiClient.analyzeUrl({ url: testCase.url })
      
      expect(response.success).toBe(true)
      apiAssertions.validateSuccessResponse(response)
      
      // GitHub should be low risk
      expect(response.data?.riskLevel).toBe('low')
      expect(response.data?.riskStatus).toBe('safe')
      
      // Should have SSL data for HTTPS URL
      if (response.data?.url.startsWith('https:')) {
        expect(response.data.sslCertificate).toBeDefined()
      }
    })
    
    test('should handle HTTP-only URL', async () => {
      const testCase = TEST_URLS.suspicious.httpOnly
      console.log(`\n📋 Testing: ${testCase.description}`)
      
      const response = await apiClient.analyzeUrl({ url: testCase.url })
      
      expect(response.success).toBe(true)
      apiAssertions.validateSuccessResponse(response)
      
      // Should flag HTTP protocol as a risk factor
      const protocolFactor = response.data?.factors.find(f => f.type === 'protocol')
      expect(protocolFactor).toBeDefined()
      expect(protocolFactor?.description).toContain('HTTP')
      
      // Should not have SSL data for HTTP URL
      expect(response.data?.sslCertificate).toBeUndefined()
      
      console.log(`   ✅ Protocol risk factor detected: ${protocolFactor?.description}`)
    })
    
    test('should handle IP address URL', async () => {
      const testCase = TEST_URLS.suspicious.ipAddress
      console.log(`\n📋 Testing: ${testCase.description}`)
      
      const response = await apiClient.analyzeUrl({ url: testCase.url })
      
      expect(response.success).toBe(true)
      apiAssertions.validateSuccessResponse(response)
      
      // Should flag IP address usage
      const domainFactor = response.data?.factors.find(f => f.type === 'domain')
      expect(domainFactor).toBeDefined()
      expect(domainFactor?.description).toContain('IP')
      
      console.log(`   ✅ IP address risk factor detected: ${domainFactor?.description}`)
    })
  })
  
  describe('Error Handling', () => {
    test('should handle invalid URL format gracefully', async () => {
      const invalidUrls = Object.values(TEST_URLS.invalid)
      
      for (const testCase of invalidUrls) {
        console.log(`\n📋 Testing invalid URL: ${testCase.description}`)
        
        const response = await apiClient.analyzeUrl({ url: testCase.url })
        
        expect(response.success).toBe(false)
        apiAssertions.validateErrorResponse(response)
        
        console.log(`   ✅ Error handled: ${response.error}`)
      }
    })
    
    test('should handle malformed request body', async () => {
      // Send malformed request directly
      const response = await fetch(`${API_TEST_CONFIG.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid json}',
      })
      
      // Should return 400 or 500
      expect([400, 500]).toContain(response.status)
    })
  })
  
  describe('Performance', () => {
    test('should complete analysis within acceptable time', async () => {
      const url = TEST_URLS.clean.google.url
      
      const startTime = Date.now()
      const response = await apiClient.analyzeUrl({ url })
      const duration = Date.now() - startTime
      
      expect(response.success).toBe(true)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.slow)
      
      // Categorize performance
      let performanceLevel: string
      if (duration < PERFORMANCE_THRESHOLDS.fast) {
        performanceLevel = '🚀 Fast'
      } else if (duration < PERFORMANCE_THRESHOLDS.normal) {
        performanceLevel = '✅ Normal'
      } else {
        performanceLevel = '⚠️ Slow'
      }
      
      console.log(`\n⏱️ Performance Test:`)
      console.log(`   URL: ${url}`)
      console.log(`   Duration: ${duration}ms`)
      console.log(`   Performance: ${performanceLevel}`)
    })
    
    test('should handle repeated requests (caching)', async () => {
      const url = TEST_URLS.clean.wikipedia.url
      
      console.log('\n🔄 Testing caching behavior')
      
      // First request
      const response1 = await apiClient.analyzeUrl({ url })
      expect(response1.success).toBe(true)
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Second request (should potentially use cache)
      const startTime = Date.now()
      const response2 = await apiClient.analyzeUrl({ url })
      const duration = Date.now() - startTime
      
      expect(response2.success).toBe(true)
      
      // Second request might be faster due to caching
      console.log(`   First request: Success`)
      console.log(`   Second request: ${duration}ms`)
      
      // Check if any services reported cache usage
      if (response2.data) {
        const cacheUsage = {
          domainAge: response2.data.domainAge?.fromCache,
          ssl: response2.data.sslCertificate?.fromCache,
          reputation: response2.data.reputation?.fromCache,
          ai: response2.data.aiAnalysis?.fromCache,
        }
        
        console.log('   Cache Usage:')
        Object.entries(cacheUsage).forEach(([service, cached]) => {
          if (cached !== undefined) {
            console.log(`     - ${service}: ${cached ? 'Cached' : 'Fresh'}`)
          }
        })
      }
    })
  })
  
  describe('Batch Analysis', () => {
    test('should analyze multiple URLs', async () => {
      const urls = getDebugTestUrls().slice(0, 3) // Limit to 3 for speed
      
      console.log(`\n📊 Batch analyzing ${urls.length} URLs`)
      
      const results = await apiClient.analyzeUrls(urls)
      
      expect(results).toHaveLength(urls.length)
      
      // Summary
      console.log('\n📈 Batch Analysis Summary:')
      results.forEach((result, index) => {
        const url = urls[index]
        if (result.success && result.data) {
          console.log(`   ${index + 1}. ${url}`)
          console.log(`      Risk: ${result.data.riskLevel} (${result.data.riskScore}/100)`)
        } else {
          console.log(`   ${index + 1}. ${url}: Failed - ${result.error}`)
        }
      })
      
      // All should complete (success or error)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.timestamp).toBeDefined()
      })
    })
  })
  
  // Debug mode detailed analysis
  if (API_TEST_CONFIG.debugMode && getCustomTestUrl()) {
    describe('Debug Mode - Detailed Analysis', () => {
      test('should provide detailed analysis for custom URL', async () => {
        const url = getCustomTestUrl()!
        
        console.log('\n🔬 DETAILED ANALYSIS MODE')
        console.log('=' .repeat(50))
        console.log(`URL: ${url}`)
        console.log('=' .repeat(50))
        
        const response = await apiClient.analyzeUrl({ url })
        
        if (response.success && response.data) {
          // Full data dump
          console.log('\n📝 Complete Response Data:')
          console.log(JSON.stringify(response.data, null, 2))
          
          // Validation details if modified
          if (response.validation) {
            console.log('\n🔧 URL Validation/Sanitization:')
            console.log(`   Original: ${response.validation.original}`)
            console.log(`   Final: ${response.validation.final}`)
            console.log(`   Modified: ${response.validation.wasModified}`)
            if (response.validation.changes.length > 0) {
              console.log(`   Changes: ${response.validation.changes.join(', ')}`)
            }
          }
        } else {
          console.log('\n❌ Analysis Failed:')
          console.log(`   Error: ${response.error}`)
          console.log(`   Message: ${response.message}`)
          if (response.details) {
            console.log('   Details:')
            response.details.forEach(detail => {
              console.log(`     - ${detail.field}: ${detail.message}`)
            })
          }
        }
      })
    })
  }
})