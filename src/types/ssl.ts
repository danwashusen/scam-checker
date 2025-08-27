/**
 * Raw SSL certificate data from Node.js TLS module
 */
export interface SSLCertificateData {
  subject: {
    CN?: string
    O?: string
    OU?: string
    L?: string
    ST?: string
    C?: string
  }
  issuer: {
    CN?: string
    O?: string
    OU?: string
    L?: string
    ST?: string
    C?: string
  }
  subjectaltname?: string
  infoAccess?: {
    [key: string]: string[] | undefined
  }
  modulus?: string
  exponent?: string
  valid_from: string
  valid_to: string
  fingerprint: string
  fingerprint256: string
  fingerprint512?: string
  ext_key_usage?: string[]
  serialNumber: string
  raw: Buffer
}

/**
 * SSL certificate chain information
 */
export interface SSLCertificateChain {
  certificates: SSLCertificateData[]
  isComplete: boolean
  depth: number
  rootCA: string | null
  intermediates: string[]
}

/**
 * Certificate Authority reputation and information
 */
export interface CertificateAuthorityInfo {
  name: string
  normalized: string
  trustScore: number // 0-1 (higher is more trustworthy)
  isWellKnown: boolean
  knownForIssues: boolean
  validationLevel: 'DV' | 'OV' | 'EV' | 'unknown'
}

/**
 * SSL certificate security assessment
 */
export interface SSLSecurityAssessment {
  encryptionStrength: 'weak' | 'moderate' | 'strong'
  keySize: number
  keyAlgorithm: string
  signatureAlgorithm: string
  isModernCrypto: boolean
  hasWeakCrypto: boolean
  supportsModernTLS: boolean
  vulnerabilities: string[]
}

/**
 * SSL certificate validation results
 */
export interface SSLValidationResult {
  isValid: boolean
  isExpired: boolean
  isSelfSigned: boolean
  isRevoked: boolean | null // null if OCSP check unavailable
  chainValid: boolean
  domainMatch: boolean
  sanMatch: boolean
  validationErrors: Array<{
    type: 'expiry' | 'chain' | 'domain' | 'revocation' | 'signature' | 'other'
    message: string
    severity: 'low' | 'medium' | 'high'
  }>
}

/**
 * Processed SSL certificate analysis results
 */
export interface SSLCertificateAnalysis {
  domain: string
  issuedDate: Date | null
  expirationDate: Date | null
  daysUntilExpiry: number | null
  certificateAge: number | null // days since issuance
  certificateType: 'DV' | 'OV' | 'EV' | 'self-signed' | 'unknown'
  certificateAuthority: CertificateAuthorityInfo | null
  security: SSLSecurityAssessment
  validation: SSLValidationResult
  score: number // Risk score 0-100 (higher is more risky)
  confidence: number // Confidence in analysis 0-1
  riskFactors: Array<{
    type: 'age' | 'expiry' | 'authority' | 'validation' | 'security' | 'domain'
    description: string
    score: number
    severity: 'low' | 'medium' | 'high'
  }>
  subjectAlternativeNames: string[]
  commonName: string | null
}

/**
 * Cache entry for SSL certificate data
 */
export interface SSLCacheEntry {
  domain: string
  certificateData: SSLCertificateData
  chain: SSLCertificateChain | null
  analysis: SSLCertificateAnalysis
  timestamp: string
  ttl: number
}

/**
 * SSL connection options
 */
export interface SSLConnectionOptions {
  timeout?: number // Timeout in milliseconds (default: 5000)
  port?: number // Port to connect to (default: 443)
  servername?: string // SNI servername
  rejectUnauthorized?: boolean // Reject invalid certificates (default: false for analysis)
  checkServerIdentity?: boolean // Check server identity (default: true)
  retries?: number // Number of retries on failure (default: 2)
  protocol?: string // TLS protocol version
}

/**
 * SSL service configuration
 */
export interface SSLServiceConfig {
  cacheEnabled: boolean
  cacheTtl: number // Cache TTL in milliseconds (6 hours default)
  defaultTimeout: number
  maxRetries: number
  enableOCSPCheck: boolean
  enableChainValidation: boolean
  defaultPort: number
}

/**
 * SSL analysis result
 */
export interface SSLAnalysisResult {
  success: boolean
  domain: string
  port: number
  data?: SSLCertificateAnalysis
  error?: SSLError
  fromCache: boolean
  processingTimeMs: number
}

/**
 * SSL error types
 */
export interface SSLError {
  type: 'connection' | 'timeout' | 'certificate' | 'validation' | 'parsing' | 'network' | 'unknown'
  message: string
  domain: string
  port: number
  retryable: boolean
  details?: Record<string, unknown>
  timestamp: string
}

/**
 * SSL certificate risk categories
 */
export type SSLCertificateRisk = 'very_high' | 'high' | 'medium' | 'low' | 'very_low'

/**
 * Risk scoring thresholds for SSL certificates
 */
export interface SSLRiskThresholds {
  selfSigned: number // 90-100
  expired: number // 85-95
  soonToExpire: number // Days until expiry for warning (30 days)
  recentlyIssued: number // Days since issuance for warning (30 days)
  weakEncryption: number // Key size threshold (2048 bits)
  untrustedCA: number // Trust score threshold (0.5)
}

/**
 * Certificate validation levels
 */
export type CertificateValidationType = 'DV' | 'OV' | 'EV'

/**
 * SSL connection metadata
 */
export interface SSLConnectionMetadata {
  protocol: string | null
  cipher: string | null
  connectionTime: number // Time taken for connection in ms
  handshakeTime: number // Time taken for TLS handshake in ms
  certificateChainLength: number
  serverSupportsOCSP: boolean
  serverSupportsSCT: boolean
}

/**
 * OCSP (Online Certificate Status Protocol) response
 */
export interface OCSPResponse {
  status: 'good' | 'revoked' | 'unknown' | 'unavailable'
  thisUpdate: Date | null
  nextUpdate: Date | null
  revocationTime: Date | null
  revocationReason: string | null
  responderURL: string | null
}

/**
 * Certificate transparency log information
 */
export interface CertificateTransparencyInfo {
  logged: boolean
  logEntries: Array<{
    logId: string
    logName: string
    timestamp: Date
  }>
  sctCount: number
}