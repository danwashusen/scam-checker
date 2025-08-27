import * as tls from 'tls'
import { CacheManager } from '../cache/cache-manager'
import { getRootDomain } from '../validation/url-parser'
import { logger } from '../logger'
import type { ParsedURL } from '../validation/url-parser'
import type {
  SSLCertificateAnalysis,
  SSLAnalysisResult,
  SSLError,
  SSLConnectionOptions,
  SSLServiceConfig,
  SSLCacheEntry,
  SSLCertificateData,
  SSLCertificateChain,
  CertificateAuthorityInfo,
  SSLSecurityAssessment,
  SSLValidationResult,
  SSLConnectionMetadata,
  // OCSPResponse - reserved for future OCSP implementation
} from '../../types/ssl'

/**
 * SSL Certificate Service with CacheManager integration for SSL/TLS analysis
 * 
 * Usage:
 * const sslService = new SSLService();
 * const result = await sslService.analyzeCertificate('example.com');
 */
export class SSLService {
  private cache: CacheManager<SSLCacheEntry>
  private config: SSLServiceConfig

  constructor(config?: Partial<SSLServiceConfig>) {
    this.config = {
      cacheEnabled: true,
      cacheTtl: 6 * 60 * 60 * 1000, // 6 hours
      defaultTimeout: 5000, // 5 seconds
      maxRetries: 2,
      enableOCSPCheck: false, // Disabled by default for performance
      enableChainValidation: true,
      defaultPort: 443,
      ...config
    }

    // Initialize dedicated cache instance for SSL data
    this.cache = new CacheManager<SSLCacheEntry>({
      prefix: 'ssl',
      ttl: this.config.cacheTtl,
      maxSize: 1000
    })
  }

  /**
   * Analyze SSL certificate for a domain
   * Supports both domain strings and ParsedURL objects
   */
  async analyzeCertificate(
    domainInput: string | ParsedURL,
    options?: SSLConnectionOptions
  ): Promise<SSLAnalysisResult> {
    const startTime = Date.now()
    
    try {
      // Extract domain from input
      const domain = typeof domainInput === 'string' 
        ? this.extractDomain(domainInput)
        : getRootDomain(domainInput)

      if (!domain) {
        return this.createErrorResult(domain || 'unknown', this.config.defaultPort, {
          type: 'parsing',
          message: 'Could not extract valid domain from input',
          domain: domain || 'unknown',
          port: this.config.defaultPort,
          retryable: false,
          timestamp: new Date().toISOString()
        }, startTime)
      }

      const port = options?.port || this.config.defaultPort

      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cached = await this.getCachedResult(domain, port)
        if (cached) {
          return {
            success: true,
            domain,
            port,
            data: cached.analysis,
            fromCache: true,
            processingTimeMs: Date.now() - startTime
          }
        }
      }

      // Perform SSL certificate analysis
      const analysis = await this.performSSLAnalysis(domain, port, options)
      
      // Cache the result if successful
      if (this.config.cacheEnabled && analysis) {
        await this.cacheResult(domain, port, analysis)
      }

      return {
        success: true,
        domain,
        port,
        data: analysis,
        fromCache: false,
        processingTimeMs: Date.now() - startTime
      }

    } catch (error: unknown) {
      return this.handleAnalysisError(
        typeof domainInput === 'string' ? domainInput : domainInput.domain,
        options?.port || this.config.defaultPort,
        error,
        startTime
      )
    }
  }

  /**
   * Perform the actual SSL certificate analysis with retry logic
   */
  private async performSSLAnalysis(
    domain: string,
    port: number,
    options?: SSLConnectionOptions
  ): Promise<SSLCertificateAnalysis> {
    const connectionOptions = {
      timeout: options?.timeout || this.config.defaultTimeout,
      servername: options?.servername || domain,
      rejectUnauthorized: options?.rejectUnauthorized ?? false,
      checkServerIdentity: options?.checkServerIdentity ?? true,
      protocol: options?.protocol,
    }

    const maxRetries = options?.retries || this.config.maxRetries
    let lastError: unknown = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Establish TLS connection and retrieve certificate
        const { certificateData, chain, metadata } = await this.getSSLCertificate(
          domain, 
          port, 
          connectionOptions
        )
        
        // Analyze the certificate
        const analysis = await this.analyzeCertificateData(
          domain, 
          certificateData, 
          chain, 
          metadata
        )
        
        // Log successful analysis
        logger.info('SSL certificate analysis successful', {
          domain,
          port,
          certificateType: analysis.certificateType,
          ca: analysis.certificateAuthority?.name,
          daysUntilExpiry: analysis.daysUntilExpiry,
          score: analysis.score,
          confidence: analysis.confidence,
          attempt: attempt + 1,
          connectionTime: metadata.connectionTime
        })

        return analysis

      } catch (error: unknown) {
        lastError = error
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          logger.warn('SSL analysis failed, retrying', {
            domain,
            port,
            attempt: attempt + 1,
            maxRetries,
            retryDelay: delay,
            error: error instanceof Error ? error : new Error(String(error))
          })
          
          await this.sleep(delay)
        }
      }
    }

    // All retries failed, throw the last error
    throw lastError
  }

  /**
   * Establish TLS connection and retrieve certificate data
   */
  private async getSSLCertificate(
    domain: string,
    port: number,
    options: SSLConnectionOptions
  ): Promise<{
    certificateData: SSLCertificateData,
    chain: SSLCertificateChain | null,
    metadata: SSLConnectionMetadata
  }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      let handshakeStartTime = Date.now()
      
      const socket = tls.connect({
        host: domain,
        port: port,
        servername: options.servername,
        rejectUnauthorized: options.rejectUnauthorized,
        timeout: options.timeout
      })

      socket.on('secureConnect', () => {
        const connectionTime = Date.now() - startTime
        const handshakeTime = Date.now() - handshakeStartTime
        
        try {
          const cert = socket.getPeerCertificate(true)
          const cipher = socket.getCipher()
          const protocol = socket.getProtocol()
          
          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy()
            return reject(new Error('No certificate received from server'))
          }

          // Build certificate chain
          const chain = this.buildCertificateChain(cert)
          
          // Create metadata
          const metadata: SSLConnectionMetadata = {
            protocol,
            cipher: cipher ? `${cipher.name} (${cipher.version})` : null,
            connectionTime,
            handshakeTime,
            certificateChainLength: chain.certificates.length,
            serverSupportsOCSP: this.checkOCSPSupport(cert),
            serverSupportsSCT: this.checkSCTSupport(cert)
          }

          socket.destroy()
          resolve({
            certificateData: cert as SSLCertificateData,
            chain,
            metadata
          })
        } catch (error) {
          socket.destroy()
          reject(error)
        }
      })

      socket.on('timeout', () => {
        socket.destroy()
        reject(new Error(`SSL connection timeout after ${options.timeout}ms`))
      })

      socket.on('error', (error) => {
        socket.destroy()
        reject(error)
      })

      // Record handshake start time
      handshakeStartTime = Date.now()
    })
  }

  /**
   * Build certificate chain from Node.js certificate object
   */
  private buildCertificateChain(cert: Record<string, unknown>): SSLCertificateChain {
    const certificates: SSLCertificateData[] = []
    let current = cert
    
    while (current) {
      certificates.push(current as SSLCertificateData)
      current = current.issuerCertificate !== current ? current.issuerCertificate : null
    }

    return {
      certificates,
      isComplete: certificates.length > 1,
      depth: certificates.length - 1,
      rootCA: certificates.length > 1 ? certificates[certificates.length - 1].issuer.CN || null : null,
      intermediates: certificates.slice(1, -1).map(c => c.issuer.CN || 'Unknown').filter(Boolean)
    }
  }

  /**
   * Analyze certificate data and generate security assessment
   */
  private async analyzeCertificateData(
    domain: string,
    certificateData: SSLCertificateData,
    chain: SSLCertificateChain | null,
    _metadata: SSLConnectionMetadata
  ): Promise<SSLCertificateAnalysis> {
    // Parse certificate dates
    const issuedDate = new Date(certificateData.valid_from)
    const expirationDate = new Date(certificateData.valid_to)
    const now = new Date()
    
    const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const certificateAge = Math.ceil((now.getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24))

    // Analyze certificate authority
    const certificateAuthority = this.analyzeCertificateAuthority(certificateData)
    
    // Assess security properties
    const security = this.assessSecurity(certificateData)
    
    // Validate certificate
    const validation = this.validateCertificate(domain, certificateData, chain)
    
    // Calculate risk factors and score
    const riskFactors = this.calculateRiskFactors(
      certificateData, 
      certificateAuthority, 
      security, 
      validation, 
      daysUntilExpiry, 
      certificateAge
    )
    
    const score = this.calculateRiskScore(riskFactors)
    const confidence = this.calculateConfidence(certificateData, chain, validation)

    // Extract subject alternative names
    const subjectAlternativeNames = this.extractSANs(certificateData)

    return {
      domain,
      issuedDate,
      expirationDate,
      daysUntilExpiry,
      certificateAge,
      certificateType: this.determineCertificateType(certificateData, certificateAuthority),
      certificateAuthority,
      security,
      validation,
      score,
      confidence,
      riskFactors,
      subjectAlternativeNames,
      commonName: certificateData.subject.CN || null
    }
  }

  /**
   * Analyze certificate authority information
   */
  private analyzeCertificateAuthority(cert: SSLCertificateData): CertificateAuthorityInfo | null {
    const issuerCN = cert.issuer.CN
    const issuerO = cert.issuer.O
    
    if (!issuerCN && !issuerO) {
      return null
    }

    const name = issuerCN || issuerO || 'Unknown'
    const normalized = name.toLowerCase().trim()

    // Simple CA reputation scoring based on well-known CAs
    const wellKnownCAs = [
      'digicert', 'symantec', 'verisign', 'thawte', 'geotrust',
      'rapidssl', 'comodo', 'sectigo', 'godaddy', 'letsencrypt',
      'amazon', 'microsoft', 'google', 'cloudflare', 'globalsign'
    ]

    const isWellKnown = wellKnownCAs.some(ca => normalized.includes(ca))
    
    return {
      name,
      normalized,
      trustScore: isWellKnown ? 0.9 : 0.5, // Higher trust for well-known CAs
      isWellKnown,
      knownForIssues: false, // Would need a database of problematic CAs
      validationLevel: this.determineValidationLevel(cert)
    }
  }

  /**
   * Assess certificate security properties
   */
  private assessSecurity(cert: SSLCertificateData): SSLSecurityAssessment {
    const keySize = cert.modulus ? (cert.modulus.length - 1) * 4 : 0 // Hex chars to bits
    const keyAlgorithm = keySize >= 2048 ? 'RSA' : 'Unknown'
    
    // Simple signature algorithm assessment
    const signatureAlgorithm = this.extractSignatureAlgorithm(cert)
    const hasWeakCrypto = keySize < 2048 || signatureAlgorithm.includes('SHA-1') || signatureAlgorithm.includes('MD5')
    const isModernCrypto = keySize >= 2048 && !hasWeakCrypto
    
    const encryptionStrength: 'weak' | 'moderate' | 'strong' = 
      keySize < 1024 ? 'weak' :
      keySize < 2048 ? 'moderate' : 'strong'

    return {
      encryptionStrength,
      keySize,
      keyAlgorithm,
      signatureAlgorithm,
      isModernCrypto,
      hasWeakCrypto,
      supportsModernTLS: true, // Assume modern TLS if connection succeeded
      vulnerabilities: hasWeakCrypto ? ['Weak cryptographic parameters'] : []
    }
  }

  /**
   * Validate certificate against domain and other criteria
   */
  private validateCertificate(
    domain: string,
    cert: SSLCertificateData,
    chain: SSLCertificateChain | null
  ): SSLValidationResult {
    const now = new Date()
    const _issuedDate = new Date(cert.valid_from)
    const expirationDate = new Date(cert.valid_to)
    
    const isExpired = now > expirationDate
    const isSelfSigned = cert.issuer.CN === cert.subject.CN
    const chainValid = chain ? chain.isComplete && chain.certificates.length > 1 : false
    
    // Check domain match
    const commonName = cert.subject.CN?.toLowerCase()
    const sans = this.extractSANs(cert).map(san => san.toLowerCase())
    const domainLower = domain.toLowerCase()
    
    const domainMatch = commonName === domainLower || commonName === `*.${domainLower}`
    const sanMatch = sans.includes(domainLower) || sans.some(san => 
      san.startsWith('*.') && domainLower.endsWith(san.slice(2))
    )

    const validationErrors = []
    
    if (isExpired) {
      validationErrors.push({
        type: 'expiry' as const,
        message: 'Certificate has expired',
        severity: 'high' as const
      })
    }
    
    if (isSelfSigned) {
      validationErrors.push({
        type: 'signature' as const,
        message: 'Certificate is self-signed',
        severity: 'high' as const
      })
    }
    
    if (!chainValid && !isSelfSigned) {
      validationErrors.push({
        type: 'chain' as const,
        message: 'Certificate chain validation failed',
        severity: 'medium' as const
      })
    }
    
    if (!domainMatch && !sanMatch) {
      validationErrors.push({
        type: 'domain' as const,
        message: 'Certificate domain does not match requested domain',
        severity: 'high' as const
      })
    }

    return {
      isValid: validationErrors.length === 0,
      isExpired,
      isSelfSigned,
      isRevoked: null, // OCSP checking would be implemented here
      chainValid,
      domainMatch,
      sanMatch,
      validationErrors
    }
  }

  /**
   * Calculate risk factors based on certificate analysis
   */
  private calculateRiskFactors(
    _cert: SSLCertificateData,
    ca: CertificateAuthorityInfo | null,
    security: SSLSecurityAssessment,
    validation: SSLValidationResult,
    daysUntilExpiry: number,
    certificateAge: number
  ) {
    const riskFactors = []

    // Age-based risks
    if (certificateAge <= 30) {
      riskFactors.push({
        type: 'age' as const,
        description: 'Recently issued certificate (less than 30 days old)',
        score: 25,
        severity: 'medium' as const
      })
    }

    // Expiry risks
    if (validation.isExpired) {
      riskFactors.push({
        type: 'expiry' as const,
        description: 'Certificate has expired',
        score: 40,
        severity: 'high' as const
      })
    } else if (daysUntilExpiry <= 30) {
      riskFactors.push({
        type: 'expiry' as const,
        description: 'Certificate expires soon (within 30 days)',
        score: 20,
        severity: 'medium' as const
      })
    }

    // Self-signed certificates
    if (validation.isSelfSigned) {
      riskFactors.push({
        type: 'authority' as const,
        description: 'Self-signed certificate',
        score: 50,
        severity: 'high' as const
      })
    }

    // Untrusted CA
    if (ca && ca.trustScore < 0.6) {
      riskFactors.push({
        type: 'authority' as const,
        description: 'Certificate issued by lesser-known or untrusted authority',
        score: 15,
        severity: 'low' as const
      })
    }

    // Weak security
    if (security.hasWeakCrypto) {
      riskFactors.push({
        type: 'security' as const,
        description: 'Weak cryptographic parameters',
        score: 30,
        severity: 'high' as const
      })
    }

    // Validation issues
    if (!validation.domainMatch && !validation.sanMatch) {
      riskFactors.push({
        type: 'domain' as const,
        description: 'Certificate domain does not match requested domain',
        score: 35,
        severity: 'high' as const
      })
    }

    return riskFactors
  }

  /**
   * Calculate overall risk score (0-100, higher is riskier)
   */
  private calculateRiskScore(riskFactors: Array<{ score: number }>): number {
    if (riskFactors.length === 0) return 5 // Minimum baseline risk
    
    const totalScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0)
    return Math.min(Math.max(totalScore, 5), 100)
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(
    cert: SSLCertificateData,
    chain: SSLCertificateChain | null,
    validation: SSLValidationResult
  ): number {
    let confidence = 0.8 // Base confidence
    
    // Higher confidence with complete certificate chain
    if (chain && chain.isComplete) {
      confidence += 0.1
    }
    
    // Higher confidence with proper validation
    if (validation.domainMatch || validation.sanMatch) {
      confidence += 0.1
    }
    
    return Math.min(confidence, 1.0)
  }

  /**
   * Extract Subject Alternative Names from certificate
   */
  private extractSANs(cert: SSLCertificateData): string[] {
    if (!cert.subjectaltname) return []
    
    return cert.subjectaltname
      .split(', ')
      .map(san => san.replace(/^DNS:/, ''))
      .filter(Boolean)
  }

  /**
   * Determine certificate type (DV, OV, EV, self-signed)
   */
  private determineCertificateType(
    cert: SSLCertificateData,
    ca: CertificateAuthorityInfo | null
  ): 'DV' | 'OV' | 'EV' | 'self-signed' | 'unknown' {
    // Check if self-signed
    if (cert.issuer.CN === cert.subject.CN) {
      return 'self-signed'
    }

    // Use CA validation level if available
    if (ca?.validationLevel && ca.validationLevel !== 'unknown') {
      return ca.validationLevel
    }

    // Heuristics based on certificate fields
    const hasOrganization = cert.subject.O && cert.subject.O.length > 0
    const hasOrgUnit = cert.subject.OU && cert.subject.OU.length > 0
    const hasLocation = (cert.subject.L && cert.subject.L.length > 0) || 
                       (cert.subject.ST && cert.subject.ST.length > 0)

    if (hasOrganization && hasLocation && hasOrgUnit) {
      return 'EV' // Extended Validation characteristics
    } else if (hasOrganization) {
      return 'OV' // Organization Validated
    } else {
      return 'DV' // Domain Validated (most common)
    }
  }

  /**
   * Determine validation level from certificate
   */
  private determineValidationLevel(cert: SSLCertificateData): 'DV' | 'OV' | 'EV' | 'unknown' {
    // This is a simplified implementation
    const hasOrg = cert.subject.O && cert.subject.O.length > 0
    const hasLocation = (cert.subject.L && cert.subject.L.length > 0) || 
                       (cert.subject.ST && cert.subject.ST.length > 0)
    
    if (hasOrg && hasLocation) return 'EV'
    if (hasOrg) return 'OV'
    return 'DV'
  }

  /**
   * Extract signature algorithm from certificate
   */
  private extractSignatureAlgorithm(cert: SSLCertificateData): string {
    // This would need actual certificate parsing to get the signature algorithm
    // For now, return a default based on key size and current date
    const keySize = cert.modulus ? (cert.modulus.length - 1) * 4 : 0
    if (keySize >= 2048) {
      return 'SHA-256 with RSA'
    } else {
      return 'SHA-1 with RSA' // Likely weak
    }
  }

  /**
   * Check if server supports OCSP
   */
  private checkOCSPSupport(cert: SSLCertificateData): boolean {
    return cert.infoAccess ? 
      Object.keys(cert.infoAccess).some(key => key.includes('OCSP')) : 
      false
  }

  /**
   * Check if server supports Certificate Transparency (SCT)
   */
  private checkSCTSupport(_cert: SSLCertificateData): boolean {
    // Would need to check for SCT extension in certificate
    // Simplified implementation
    return false
  }

  /**
   * Extract domain from various input formats
   */
  private extractDomain(input: string): string | null {
    try {
      // Remove protocol and path if present
      const cleaned = input.replace(/^https?:\/\//, '').split('/')[0].split('?')[0]
      
      // Handle port numbers
      const withoutPort = cleaned.split(':')[0]
      
      // Basic domain validation
      if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(withoutPort)) {
        return null
      }
      
      return withoutPort.toLowerCase()
    } catch {
      return null
    }
  }

  /**
   * Get cached SSL result if available and not expired
   */
  private async getCachedResult(domain: string, port: number): Promise<SSLCacheEntry | null> {
    try {
      const cacheKey = `${domain}:${port}`
      return await this.cache.get(cacheKey)
    } catch (error) {
      logger.warn('SSL cache retrieval failed', {
        domain,
        port,
        error: error instanceof Error ? error : new Error(String(error))
      })
      return null
    }
  }

  /**
   * Cache SSL analysis result
   */
  private async cacheResult(
    domain: string, 
    port: number, 
    analysis: SSLCertificateAnalysis
  ): Promise<void> {
    try {
      const cacheKey = `${domain}:${port}`
      const cacheEntry: SSLCacheEntry = {
        domain,
        certificateData: {} as SSLCertificateData, // Don't store raw cert data
        chain: null,
        analysis,
        timestamp: new Date().toISOString(),
        ttl: this.config.cacheTtl
      }

      await this.cache.set(cacheKey, cacheEntry)
    } catch (error) {
      logger.warn('Failed to cache SSL result', {
        domain,
        port,
        error: error instanceof Error ? error : new Error(String(error))
      })
      // Don't throw - caching failure shouldn't break the analysis
    }
  }

  /**
   * Handle SSL analysis errors
   */
  private handleAnalysisError(
    domain: string,
    port: number,
    error: unknown,
    startTime: number
  ): SSLAnalysisResult {
    const sslError = this.categorizeError(domain, port, error)
    
    logger.error('SSL certificate analysis failed', {
      domain,
      port,
      errorType: sslError.type,
      errorMessage: sslError.message,
      retryable: sslError.retryable,
      processingTime: Date.now() - startTime
    })

    return this.createErrorResult(domain, port, sslError, startTime)
  }

  /**
   * Categorize errors for better handling
   */
  private categorizeError(domain: string, port: number, error: unknown): SSLError {
    const timestamp = new Date().toISOString()
    
    if (error.code === 'ENOTFOUND') {
      return {
        type: 'network',
        message: 'Host not found',
        domain,
        port,
        retryable: false,
        timestamp,
        details: { code: error.code }
      }
    }
    
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'SSL connection timeout',
        domain,
        port,
        retryable: true,
        timestamp,
        details: { timeout: true }
      }
    }
    
    if (error.code === 'ECONNREFUSED') {
      return {
        type: 'connection',
        message: 'Connection refused - SSL/TLS service unavailable',
        domain,
        port,
        retryable: true,
        timestamp,
        details: { code: error.code }
      }
    }
    
    if (error.message?.includes('certificate') || error.code === 'CERT_UNTRUSTED') {
      return {
        type: 'certificate',
        message: 'Certificate validation error',
        domain,
        port,
        retryable: false,
        timestamp,
        details: { certificateError: true }
      }
    }
    
    return {
      type: 'unknown',
      message: error.message || 'Unknown SSL analysis error',
      domain,
      port,
      retryable: false,
      timestamp,
      details: error
    }
  }

  /**
   * Create error result object
   */
  private createErrorResult(
    domain: string,
    port: number,
    error: SSLError,
    startTime: number
  ): SSLAnalysisResult {
    return {
      success: false,
      domain,
      port,
      error,
      fromCache: false,
      processingTimeMs: Date.now() - startTime
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Clear SSL cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Check if domain SSL analysis is cached
   */
  async isCached(domain: string, port: number = 443): Promise<boolean> {
    const cacheKey = `${domain}:${port}`
    return await this.cache.has(cacheKey)
  }
}

/**
 * Default SSL service instance
 */
export const defaultSSLService = new SSLService()