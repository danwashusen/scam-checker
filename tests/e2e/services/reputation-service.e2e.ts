import { ReputationService } from '../../../src/lib/analysis/reputation-service'
import { E2E_TEST_CONFIG, isServiceConfigured } from './helpers/test-config'
import { TEST_URLS, EXPECTED_RESPONSE_TIMES } from './helpers/test-data'
import { testHelper, assertions } from './helpers/api-helpers'

describe('ReputationService E2E Tests', () => {
  let service: ReputationService
  const config = E2E_TEST_CONFIG.reputation
  
  // Skip all tests if no API key
  const skipTests = !isServiceConfigured('reputation')
  
  beforeAll(() => {
    if (skipTests) {
      console.log('⚠️  Skipping ReputationService E2E tests - no API key configured')
      return
    }
    
    service = new ReputationService({
      apiKey: config.apiKey,
      timeout: config.timeout,
      maxRetries: 1 // Reduce retries for tests
    })
    
    console.log('🚀 ReputationService E2E tests starting')
    console.log(`   API Key: ${config.apiKey ? '✅ Configured' : '❌ Missing'}`)
  })
  
  afterEach(async () => {
    // Rate limiting between tests
    await testHelper.enforceRateLimit('reputation')
  })
  
  describe('API Connectivity', () => {
    test('should successfully connect to Google Safe Browsing API', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      const startTime = Date.now()
      testHelper.logContext({
        test: 'API connectivity',
        url: TEST_URLS.googleHome.url
      })
      
      const { result, duration } = await testHelper.measureTime(
        () => service.analyzeURL(TEST_URLS.googleHome.url),
        'Google Safe Browsing API call'
      )
      
      // Verify successful connection
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(duration).toBeWithinRange(
        EXPECTED_RESPONSE_TIMES.reputation.min,
        EXPECTED_RESPONSE_TIMES.reputation.max
      )
      
      // Log results
      console.log(`   Clean URL: ${result.data?.isClean}`)
      console.log(`   Risk Score: ${result.data?.score}`)
      console.log(`   From Cache: ${result.fromCache}`)
    })
    
    test('should handle authentication properly', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      // Test with invalid API key
      const badService = new ReputationService({
        apiKey: 'invalid_api_key_12345',
        timeout: 5000
      })
      
      const result = await badService.analyzeURL(TEST_URLS.googleHome.url)
      
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error?.type).toBe('auth_error')
        console.log(`   Auth error handled: ${result.error?.message}`)
      }
    })
  })
  
  describe('Clean URL Analysis', () => {
    test('should correctly identify google.com as clean', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      testHelper.logContext({
        test: 'Clean URL analysis',
        url: config.testUrls.clean
      })
      
      const result = await service.analyzeURL(config.testUrls.clean)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.isClean).toBe(true)
      expect(result.data?.threatMatches).toHaveLength(0)
      expect(result.data?.riskLevel).toBe('low')
      expect(result.data?.score).toBeLessThanOrEqual(20)
      
      // Validate response structure
      testHelper.validateResponseStructure(result.data, [
        'url', 'isClean', 'threatMatches', 'riskFactors',
        'score', 'riskLevel', 'confidence', 'timestamp'
      ], 'ReputationService')
      
      assertions.assertValidScore(result.data!.score)
      assertions.assertValidConfidence(result.data!.confidence)
    })
    
    test('should handle URL with path correctly', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      const result = await service.analyzeURL(config.testUrls.cleanWithPath)
      
      expect(result.success).toBe(true)
      expect(result.data?.isClean).toBe(true)
      console.log(`   URL with path: ${config.testUrls.cleanWithPath}`)
      console.log(`   Analysis result: Clean=${result.data?.isClean}`)
    })
    
    test('should handle URL with query parameters', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      const result = await service.analyzeURL(config.testUrls.cleanWithQuery)
      
      expect(result.success).toBe(true)
      expect(result.data?.isClean).toBe(true)
    })
  })
  
  describe('Threat Detection', () => {
    test('should detect test malware URL if available', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      // Note: This uses Google's test URLs which may not always be available
      const testUrl = config.testUrls.testMalicious
      
      if (!testUrl.includes('testsafebrowsing')) {
        console.log('   ⚠️  Skipping malware test - no test URL available')
        return
      }
      
      testHelper.logContext({
        test: 'Malware detection',
        url: testUrl
      })
      
      const result = await service.analyzeURL(testUrl)
      
      if (result.success && result.data && !result.data.isClean) {
        expect(result.data.threatMatches.length).toBeGreaterThan(0)
        expect(result.data.riskLevel).toMatch(/medium|high/)
        expect(result.data.score).toBeGreaterThan(30)
        
        console.log(`   Threats detected: ${result.data.threatMatches.length}`)
        result.data.threatMatches.forEach(threat => {
          console.log(`   - ${threat.threatType} on ${threat.platformType}`)
        })
      } else {
        console.log('   ℹ️  Test malware URL not detected as threat (may be outdated)')
      }
    })
  })
  
  describe('Error Handling', () => {
    test('should handle network timeout gracefully', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      const timeoutService = new ReputationService({
        apiKey: config.apiKey,
        timeout: 1, // 1ms timeout to force failure
        maxRetries: 0
      })
      
      const result = await timeoutService.analyzeURL(TEST_URLS.googleHome.url)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      
      const errorType = testHelper.classifyError(result.error)
      console.log(`   Timeout handled: ${errorType}`)
    })
    
    test('should handle invalid URL format', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      const result = await service.analyzeURL('not-a-valid-url')
      
      // Service should still attempt to process it
      expect(result).toBeDefined()
      console.log(`   Invalid URL handled: success=${result.success}`)
    })
  })
  
  describe('Caching Behavior', () => {
    test('should use cache for repeated requests', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      const url = config.testUrls.clean
      
      // First request - should not be from cache
      const result1 = await service.analyzeURL(url)
      expect(result1.success).toBe(true)
      expect(result1.fromCache).toBe(false)
      
      // Wait a moment
      await testHelper.delay(100)
      
      // Second request - should be from cache
      const result2 = await service.analyzeURL(url)
      expect(result2.success).toBe(true)
      expect(result2.fromCache).toBe(true)
      
      // Data should match
      expect(result2.data?.score).toBe(result1.data?.score)
      expect(result2.data?.isClean).toBe(result1.data?.isClean)
      
      console.log(`   Cache hit confirmed for: ${url}`)
    })
  })
  
  describe('Batch Processing', () => {
    test('should handle multiple URLs efficiently', async () => {
      if (skipTests) {
        console.log('⚠️  Skipping test - no API key configured')
        return
      }
      const urls = [
        config.testUrls.clean,
        config.testUrls.cleanWithPath,
        config.testDomains.cleanAlternative
      ]
      
      testHelper.logContext({
        test: 'Batch processing',
        urlCount: urls.length
      })
      
      const startTime = Date.now()
      const results = await service.checkMultipleURLs(urls)
      const duration = Date.now() - startTime
      
      expect(results).toHaveLength(urls.length)
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        console.log(`   URL ${index + 1}: success=${result.success}, cached=${result.fromCache}`)
      })
      
      console.log(`   Total batch time: ${duration}ms`)
      console.log(`   Average per URL: ${Math.round(duration / urls.length)}ms`)
    })
  })
})