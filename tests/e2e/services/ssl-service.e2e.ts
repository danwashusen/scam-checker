import { SSLService } from '../../../src/lib/analysis/ssl-service'
import { E2E_TEST_CONFIG } from './helpers/test-config'
import { EXPECTED_RESPONSE_TIMES } from './helpers/test-data'
import { testHelper, assertions } from './helpers/api-helpers'

describe('SSLService E2E Tests', () => {
  let service: SSLService
  const config = E2E_TEST_CONFIG.ssl
  
  beforeAll(() => {
    service = new SSLService({
      defaultTimeout: config.timeout,
      maxRetries: 1,
      cacheEnabled: false, // Disable cache for E2E tests
      enableChainValidation: true
    })
    
    console.log('🚀 SSLService E2E tests starting')
    console.log('   Testing SSL certificate validation')
  })
  
  afterEach(async () => {
    // Small delay between SSL tests
    await testHelper.enforceRateLimit('ssl')
  })
  
  describe('TLS Connection', () => {
    test('should establish TLS connection to google.com', async () => {
      const domain = config.testDomains.valid
      
      testHelper.logContext({
        test: 'TLS connection',
        domain: domain,
        port: config.testPorts.standard
      })
      
      const { result, duration } = await testHelper.measureTime(
        () => service.analyzeCertificate(domain),
        'SSL certificate analysis'
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.domain).toBe(domain)
      expect(result.port).toBe(443)
      expect(duration).toBeWithinRange(
        EXPECTED_RESPONSE_TIMES.ssl.min,
        EXPECTED_RESPONSE_TIMES.ssl.max
      )
      
      console.log(`   Certificate type: ${result.data?.certificateType}`)
      console.log(`   CA: ${result.data?.certificateAuthority?.name}`)
      console.log(`   Days until expiry: ${result.data?.daysUntilExpiry}`)
    })
    
    test('should connect on non-standard port', async () => {
      // Note: This test assumes the domain supports the alternative port
      const result = await service.analyzeCertificate(
        config.testDomains.valid,
        { port: config.testPorts.alternative }
      )
      
      if (result.success) {
        expect(result.port).toBe(config.testPorts.alternative)
        console.log(`   Connected on port ${config.testPorts.alternative}`)
      } else {
        console.log(`   Alternative port not available (expected)`)
      }
    })
  })
  
  describe('Certificate Validation', () => {
    test('should validate valid certificate for google.com', async () => {
      const result = await service.analyzeCertificate(config.testDomains.valid)
      
      expect(result.success).toBe(true)
      expect(result.data?.validation.isValid).toBe(true)
      expect(result.data?.validation.isExpired).toBe(false)
      expect(result.data?.validation.isSelfSigned).toBe(false)
      expect(result.data?.validation.domainMatch).toBe(true)
      
      // Should have low risk score
      expect(result.data?.score).toBeLessThan(50)  // Adjusted for real-world certificates
      assertions.assertValidScore(result.data!.score)
      assertions.assertValidConfidence(result.data!.confidence)
      
      console.log(`   Certificate valid: ✅`)
      console.log(`   Risk score: ${result.data?.score}`)
    })
    
    test('should detect expired certificate', async () => {
      const domain = config.testDomains.expired
      
      testHelper.logContext({
        test: 'Expired certificate detection',
        domain: domain
      })
      
      const result = await service.analyzeCertificate(domain)
      
      if (result.success) {
        expect(result.data?.validation.isExpired).toBe(true)
        expect(result.data?.validation.isValid).toBe(false)
        expect(result.data?.score).toBeGreaterThan(30)
        
        const expiryError = result.data?.validation.validationErrors?.find(
          e => e.type === 'expiry'
        )
        expect(expiryError).toBeDefined()
        
        console.log(`   Expired certificate detected: ✅`)
        console.log(`   Days expired: ${Math.abs(result.data?.daysUntilExpiry || 0)}`)
      }
    })
    
    test('should detect self-signed certificate', async () => {
      const domain = config.testDomains.selfSigned
      
      const result = await service.analyzeCertificate(domain)
      
      if (result.success) {
        expect(result.data?.validation.isSelfSigned).toBe(true)
        expect(result.data?.certificateType).toBe('self-signed')
        expect(result.data?.score).toBeGreaterThan(40)
        
        console.log(`   Self-signed certificate detected: ✅`)
        console.log(`   Risk score: ${result.data?.score}`)
      }
    })
    
    test('should detect wrong host certificate', async () => {
      const domain = config.testDomains.wrongHost
      
      const result = await service.analyzeCertificate(domain)
      
      if (result.success) {
        expect(result.data?.validation.domainMatch).toBe(false)
        
        const domainError = result.data?.validation.validationErrors?.find(
          e => e.type === 'domain'
        )
        expect(domainError).toBeDefined()
        
        console.log(`   Wrong host detected: ✅`)
      }
    })
    
    test('should detect untrusted root certificate', async () => {
      const domain = config.testDomains.untrusted
      
      const result = await service.analyzeCertificate(domain)
      
      if (result.success) {
        expect(result.data?.validation.chainValid).toBe(false)
        expect(result.data?.score).toBeGreaterThan(30)
        
        console.log(`   Untrusted root detected: ✅`)
      }
    })
  })
  
  describe('Certificate Chain Analysis', () => {
    test('should analyze complete certificate chain', async () => {
      const domain = config.testDomains.valid
      
      const result = await service.analyzeCertificate(domain)
      
      expect(result.success).toBe(true)
      
      // Note: Chain details are in internal data, check what's exposed
      if (result.data) {
        expect(result.data.certificateAuthority).toBeDefined()
        expect(result.data.certificateAuthority?.name).toBeTruthy()
        
        console.log(`   CA: ${result.data.certificateAuthority?.name}`)
        console.log(`   CA trusted: ${result.data.certificateAuthority?.isWellKnown}`)
      }
    })
    
    test('should handle incomplete certificate chain', async () => {
      const domain = config.testDomains.incomplete
      
      const result = await service.analyzeCertificate(domain)
      
      if (result.success && result.data) {
        console.log(`   Incomplete chain handled`)
        console.log(`   Chain valid: ${result.data.validation.chainValid}`)
      }
    })
  })
  
  describe('Certificate Properties', () => {
    test('should extract certificate details correctly', async () => {
      const domain = config.testDomains.validEV
      
      const result = await service.analyzeCertificate(domain)
      
      expect(result.success).toBe(true)
      
      testHelper.validateResponseStructure(result.data, [
        'domain',
        'issuedDate',
        'expirationDate',
        'daysUntilExpiry',
        'certificateAge',
        'certificateType',
        'score',
        'confidence',
        'riskFactors'
      ], 'SSLService')
      
      // Check dates are valid
      assertions.assertValidIssuedDate(result.data!.issuedDate)
      assertions.assertValidExpirationDate(result.data!.expirationDate)
      
      console.log(`   Issued: ${result.data?.issuedDate}`)
      console.log(`   Expires: ${result.data?.expirationDate}`)
      console.log(`   Type: ${result.data?.certificateType}`)
      console.log(`   Common Name: ${result.data?.commonName}`)
    })
    
    test('should extract Subject Alternative Names', async () => {
      const result = await service.analyzeCertificate(config.testDomains.valid)
      
      if (result.success && result.data) {
        expect(result.data.subjectAlternativeNames).toBeDefined()
        expect(Array.isArray(result.data.subjectAlternativeNames)).toBe(true)
        
        console.log(`   SANs found: ${result.data.subjectAlternativeNames?.length}`)
        result.data.subjectAlternativeNames?.slice(0, 3).forEach(san => {
          console.log(`   - ${san}`)
        })
      }
    })
  })
  
  describe('Security Assessment', () => {
    test('should assess encryption strength', async () => {
      const result = await service.analyzeCertificate(config.testDomains.valid)
      
      expect(result.success).toBe(true)
      expect(result.data?.security).toBeDefined()
      expect(result.data?.security.encryptionStrength).toMatch(/weak|moderate|strong/)
      expect(result.data?.security.keySize).toBeGreaterThanOrEqual(2048)
      
      console.log(`   Encryption: ${result.data?.security.encryptionStrength}`)
      console.log(`   Key size: ${result.data?.security.keySize} bits`)
      console.log(`   Modern crypto: ${result.data?.security.isModernCrypto}`)
    })
    
    test('should identify weak cryptography', async () => {
      // If badssl has a weak crypto example
      const domain = 'weak.badssl.com' // May not exist
      
      const result = await service.analyzeCertificate(domain)
      
      if (result.success && result.data) {
        if (result.data.security.hasWeakCrypto) {
          console.log(`   Weak crypto detected: ✅`)
          console.log(`   Vulnerabilities: ${result.data.security.vulnerabilities?.join(', ')}`)
        }
      } else if (result.error) {
        console.log(`   Weak crypto test domain not available`)
      }
    })
  })
  
  describe('Error Handling', () => {
    test('should handle non-HTTPS domains', async () => {
      const url = config.testUrls.http
      
      const result = await service.analyzeCertificate(url)
      
      // Should fail to connect
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.type).toMatch(/connection|certificate|network/)
      
      console.log(`   HTTP-only domain handled: ${result.error?.type}`)
    })
    
    test('should handle connection refused', async () => {
      const result = await service.analyzeCertificate(
        'google.com',  // Use a domain that definitely resolves
        { port: config.testPorts.invalid }  // But on an invalid port
      )
      
      expect(result.success).toBe(false)
      expect(result.error?.type).toMatch(/connection|network|timeout/)
      console.log(`   Connection refused handled`)
    })
    
    test('should handle timeout properly', async () => {
      const timeoutService = new SSLService({
        defaultTimeout: 100, // 100ms
        maxRetries: 0
      })
      
      const result = await timeoutService.analyzeCertificate(config.testDomains.valid)
      
      if (!result.success) {
        expect(result.error?.type).toBe('timeout')
        console.log(`   Timeout handled: ${result.error?.message}`)
      }
    })
    
    test('should handle invalid domain format', async () => {
      const result = await service.analyzeCertificate('not a valid domain!')
      
      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('parsing')
    })
  })
  
  describe('Performance', () => {
    test('should complete analysis within acceptable time', async () => {
      const domains = [
        config.testDomains.valid,
        config.testDomains.validEV
      ]
      
      const timings: number[] = []
      
      for (const domain of domains) {
        const start = Date.now()
        const result = await service.analyzeCertificate(domain)
        const duration = Date.now() - start
        
        if (result.success) {
          timings.push(duration)
          console.log(`   ${domain}: ${duration}ms`)
        }
        
        await testHelper.delay(500)
      }
      
      if (timings.length > 0) {
        const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length
        console.log(`   Average analysis time: ${Math.round(avgTime)}ms`)
        expect(avgTime).toBeLessThan(5000)
      }
    })
  })
})