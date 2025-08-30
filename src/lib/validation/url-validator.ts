import { URL } from 'url'

export interface URLValidationResult {
  isValid: boolean
  error?: string
  errorType?: 'invalid-format' | 'unsupported-protocol' | 'invalid-domain' | 'security-risk' | 'too-long'
  normalizedUrl?: string
}

export interface URLValidationOptions {
  allowedProtocols?: string[]
  maxLength?: number
  allowPrivateIPs?: boolean
  allowLocalhost?: boolean
}

const DEFAULT_OPTIONS: Required<URLValidationOptions> = {
  allowedProtocols: ['http:', 'https:'],
  maxLength: 2083, // IE URL limit
  allowPrivateIPs: false,
  allowLocalhost: false,
}

// Private IP ranges for SSRF protection
const PRIVATE_IP_PATTERNS = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^127\./,                   // 127.0.0.0/8 (localhost)
  /^169\.254\./,              // 169.254.0.0/16 (link-local)
  /^0\./,                     // 0.0.0.0/8
  /^224\./,                   // 224.0.0.0/4 (multicast)
]

const IPV6_PRIVATE_PATTERNS = [
  /^::1$/,                    // IPv6 localhost
  /^fc00:/,                   // IPv6 unique local addresses
  /^fe80:/,                   // IPv6 link-local
]

/**
 * Validates if a string is a valid URL according to security and format requirements
 */
export function validateURL(input: string, options: URLValidationOptions = {}): URLValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Check URL length
  if (input.length > opts.maxLength) {
    return {
      isValid: false,
      error: `URL exceeds maximum length of ${opts.maxLength} characters`,
      errorType: 'too-long',
    }
  }

  // Basic format validation
  if (!input.trim()) {
    return {
      isValid: false,
      error: 'URL cannot be empty',
      errorType: 'invalid-format',
    }
  }

  // Check for control characters and null bytes
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(input)) {
    return {
      isValid: false,
      error: 'URL contains invalid control characters',
      errorType: 'security-risk',
    }
  }

  // Early security checks for malicious protocols before URL parsing
  if (/^(javascript|data|vbscript|file):/i.test(input)) {
    return {
      isValid: false,
      error: 'URL contains potentially malicious protocol',
      errorType: 'security-risk',
    }
  }

  let url: URL
  try {
    // Handle URLs without protocol by adding https://, but preserve existing protocols
    const urlInput = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`
    url = new URL(urlInput)
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
      errorType: 'invalid-format',
    }
  }

  // Protocol validation
  if (!opts.allowedProtocols.includes(url.protocol)) {
    return {
      isValid: false,
      error: `Protocol ${url.protocol} not allowed. Allowed protocols: ${opts.allowedProtocols.join(', ')}`,
      errorType: 'unsupported-protocol',
    }
  }

  // Domain validation
  const domainValidation = validateDomain(url.hostname, opts)
  if (!domainValidation.isValid) {
    return domainValidation
  }

  // Additional security checks
  const securityValidation = performSecurityChecks(url, opts)
  if (!securityValidation.isValid) {
    return securityValidation
  }

  return {
    isValid: true,
    normalizedUrl: normalizeURL(url),
  }
}

/**
 * Validates domain name format and security constraints
 */
function validateDomain(hostname: string, options: Required<URLValidationOptions>): URLValidationResult {
  // Empty hostname
  if (!hostname) {
    return {
      isValid: false,
      error: 'Domain name cannot be empty',
      errorType: 'invalid-domain',
    }
  }

  // Length validation
  if (hostname.length > 253) {
    return {
      isValid: false,
      error: 'Domain name too long (max 253 characters)',
      errorType: 'invalid-domain',
    }
  }

  // Check for private IPs and localhost
  if (!options.allowPrivateIPs && isPrivateIP(hostname)) {
    return {
      isValid: false,
      error: 'Private IP addresses are not allowed',
      errorType: 'security-risk',
    }
  }

  // Only check localhost if it's not already allowed by private IPs
  if (!options.allowLocalhost && !options.allowPrivateIPs && isLocalhost(hostname)) {
    return {
      isValid: false,
      error: 'Localhost addresses are not allowed',
      errorType: 'security-risk',
    }
  }

  // Basic domain format validation
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/
  if (!domainPattern.test(hostname) && !isValidIP(hostname)) {
    return {
      isValid: false,
      error: 'Invalid domain name format',
      errorType: 'invalid-domain',
    }
  }

  // Check for valid TLD (must have at least one dot for domain names)
  // Exception: localhost is allowed if configured
  if (!isValidIP(hostname) && !hostname.includes('.') && hostname !== 'localhost') {
    return {
      isValid: false,
      error: 'Domain must have a valid top-level domain',
      errorType: 'invalid-domain',
    }
  }

  return { isValid: true }
}

/**
 * Performs additional security checks on the URL
 */
function performSecurityChecks(url: URL, _options: Required<URLValidationOptions>): URLValidationResult {
  // Check for suspicious patterns that might indicate malicious intent
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url.href)) {
      return {
        isValid: false,
        error: 'URL contains potentially malicious content',
        errorType: 'security-risk',
      }
    }
  }

  // Check for excessive redirects or suspicious query parameters
  if (url.href.includes('%2F%2F') || url.href.includes('//')) {
    const doubleSlashCount = (url.href.match(/\/\//g) || []).length
    if (doubleSlashCount > 1) {
      return {
        isValid: false,
        error: 'URL contains suspicious redirect patterns',
        errorType: 'security-risk',
      }
    }
  }

  return { isValid: true }
}

/**
 * Checks if hostname is a private IP address
 */
function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return true
    }
  }

  // Remove brackets if present for IPv6
  const cleanHostname = hostname.replace(/^\[|\]$/g, '')
  
  // IPv6 private ranges
  for (const pattern of IPV6_PRIVATE_PATTERNS) {
    if (pattern.test(cleanHostname)) {
      return true
    }
  }

  return false
}

/**
 * Checks if hostname is localhost
 */
function isLocalhost(hostname: string): boolean {
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '::1',
    '[::1]', // IPv6 with brackets
    '0.0.0.0',
  ]

  return localhostPatterns.includes(hostname.toLowerCase())
}

/**
 * Checks if string is a valid IP address (IPv4 or IPv6)
 */
function isValidIP(hostname: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  if (ipv4Pattern.test(hostname)) {
    const parts = hostname.split('.').map(Number)
    return parts.every(part => part >= 0 && part <= 255)
  }

  // Remove brackets if present (URL constructor includes them for IPv6)
  const cleanHostname = hostname.replace(/^\[|\]$/g, '')
  
  // IPv6 pattern (simplified)
  const ipv6Patterns = [
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, // Full form
    /^::1$/, // Localhost
    /^::$/, // All zeros
    /^([0-9a-fA-F]{1,4}:){1,7}::$/, // With compressed zeros at end
    /^::([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/, // With compressed zeros at start
    /^([0-9a-fA-F]{1,4}:){1,6}::([0-9a-fA-F]{1,4}:){1,6}[0-9a-fA-F]{1,4}$/, // With compressed zeros in middle
  ]

  return ipv6Patterns.some(pattern => pattern.test(cleanHostname))
}

/**
 * Normalizes URL for consistent processing
 */
function normalizeURL(url: URL): string {
  // Normalize the URL
  const normalized = new URL(url.href)
  
  // Lowercase hostname
  normalized.hostname = normalized.hostname.toLowerCase()
  
  // Remove default ports
  if ((normalized.protocol === 'http:' && normalized.port === '80') ||
      (normalized.protocol === 'https:' && normalized.port === '443')) {
    normalized.port = ''
  }
  
  // Remove trailing slash from pathname if it's just '/'
  if (normalized.pathname === '/' && !normalized.search && !normalized.hash) {
    normalized.pathname = '/'
  }
  
  return normalized.href
}

/**
 * Quick validation function that returns boolean
 */
export function isValidURL(input: string, options?: URLValidationOptions): boolean {
  return validateURL(input, options).isValid
}