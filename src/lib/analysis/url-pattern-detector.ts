/**
 * URL Pattern Detection Utilities
 * Advanced pattern matching for scam URL detection including homographs, typosquatting, and suspicious patterns
 */

import { Logger } from '../logger'

const logger = new Logger()

/**
 * URL pattern analysis result
 */
export interface URLPatternAnalysis {
  isHomograph: boolean
  isTyposquat: boolean
  hasSuspiciousTLD: boolean
  hasPhishingPatterns: boolean
  hasObfuscation: boolean
  suspiciousScore: number // 0-100
  detectedPatterns: string[]
  brandImpersonation?: {
    likelyTarget: string
    confidence: number
  }
}

/**
 * Suspicious TLD patterns commonly used in scams
 */
const SUSPICIOUS_TLDS = new Set([
  '.tk', '.ml', '.ga', '.cf', '.gq', // Freenom domains
  '.top', '.click', '.download', '.stream', '.science',
  '.racing', '.review', '.party', '.trade', '.webcam'
])

/**
 * High-value brands commonly impersonated
 */
const HIGH_VALUE_BRANDS = [
  'paypal', 'amazon', 'microsoft', 'apple', 'google', 'facebook', 'instagram',
  'twitter', 'linkedin', 'github', 'dropbox', 'netflix', 'spotify',
  'banking', 'chase', 'wellsfargo', 'bankofamerica', 'citibank'
]

/**
 * Homograph character mappings (common substitutions)
 */
const HOMOGRAPH_MAPPINGS: Record<string, string[]> = {
  'a': ['а', 'ɑ', 'α', '@', '4'],
  'e': ['е', 'é', 'è', '3'],
  'i': ['і', 'í', 'ì', '1', 'l'],
  'o': ['о', 'ο', '0', 'ө'],
  'p': ['р', 'ρ'],
  'c': ['с', 'ϲ'],
  'y': ['у', 'ý'],
  'x': ['х', 'χ'],
  'n': ['η', 'ñ'],
  'm': ['м', 'ɱ'],
  'h': ['н', 'ћ'],
  'b': ['Ь', 'β'],
  'd': ['ԁ', 'δ'],
  'g': ['ց', 'γ'],
  's': ['ѕ', 'š', '$'],
  't': ['τ', '7'],
  'u': ['υ', 'ü'],
  'v': ['ν', 'ѵ'],
  'w': ['ω', 'ա'],
  'z': ['ᴢ', '2']
}

/**
 * Common phishing path patterns
 */
const PHISHING_PATH_PATTERNS = [
  /\/(login|signin|sign-in|log-in)[\w\-]*\.(php|html|asp|aspx)/i,
  /\/(verify|verification|validate|confirm|secure)[\w\-]*\.(php|html)/i,
  /\/(update|renewal|suspended|locked|blocked)[\w\-]*\.(php|html)/i,
  /\/(account|billing|security|profile)[\w\-]*\.(php|html)/i,
  /\/(urgent|immediate|action|required)[\w\-]*\.(php|html)/i
]

/**
 * Suspicious parameter patterns
 */
const SUSPICIOUS_PARAM_PATTERNS = [
  /^(redirect|continue|return|next|goto|url)=https?:\/\/[^&]+/i,
  /^(token|session|auth|key)=[a-zA-Z0-9+\/=]{20,}/i,
  /^(user|username|email|login)=[^&]+/i
]

/**
 * URL obfuscation patterns
 */
const OBFUSCATION_PATTERNS = [
  /(%[0-9A-Fa-f]{2}){5,}/, // Excessive URL encoding
  /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP addresses instead of domains
  /[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]{100,}/, // Excessively long URLs
  /\b(bit\.ly|tinyurl|short|goo\.gl|t\.co|ow\.ly)/, // URL shorteners (suspicious in some contexts)
]

/**
 * URL Pattern Detector class
 */
export class URLPatternDetector {
  /**
   * Analyze URL for suspicious patterns
   */
  analyzeURL(url: string, domain: string, pathname: string): URLPatternAnalysis {
    const startTime = Date.now()

    try {
      const analysis: URLPatternAnalysis = {
        isHomograph: this.detectHomographs(domain),
        isTyposquat: this.detectTyposquatting(domain),
        hasSuspiciousTLD: this.detectSuspiciousTLD(domain),
        hasPhishingPatterns: this.detectPhishingPatterns(pathname, url),
        hasObfuscation: this.detectObfuscation(url),
        suspiciousScore: 0,
        detectedPatterns: []
      }

      // Check for brand impersonation
      const brandImpersonation = this.detectBrandImpersonation(domain)
      if (brandImpersonation) {
        analysis.brandImpersonation = brandImpersonation
      }

      // Calculate suspicious score
      analysis.suspiciousScore = this.calculateSuspiciousScore(analysis)

      // Collect detected patterns
      analysis.detectedPatterns = this.collectDetectedPatterns(analysis, domain, pathname, url)

      const processingTime = Date.now() - startTime
      logger.debug('URL pattern analysis completed', {
        url: this.sanitizeUrlForLogging(url),
        suspiciousScore: analysis.suspiciousScore,
        detectedPatterns: analysis.detectedPatterns.length,
        processingTime
      })

      return analysis

    } catch (error) {
      logger.error('URL pattern analysis failed', {
        url: this.sanitizeUrlForLogging(url),
        error: error instanceof Error ? error : new Error(String(error))
      })

      return {
        isHomograph: false,
        isTyposquat: false,
        hasSuspiciousTLD: false,
        hasPhishingPatterns: false,
        hasObfuscation: false,
        suspiciousScore: 0,
        detectedPatterns: ['analysis_failed']
      }
    }
  }

  /**
   * Detect homograph attacks in domain
   */
  private detectHomographs(domain: string): boolean {
    const normalizedDomain = domain.toLowerCase()
    
    // Check if domain contains non-ASCII characters commonly used in homograph attacks
    for (const char of normalizedDomain) {
      const charCode = char.charCodeAt(0)
      // Check for non-ASCII characters that might be homographs
      if (charCode > 127) {
        // Check if it's a known homograph character
        for (const [_ascii, homographs] of Object.entries(HOMOGRAPH_MAPPINGS)) {
          if (homographs.includes(char)) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Detect typosquatting attempts
   */
  private detectTyposquatting(domain: string): boolean {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
    // Extract just the domain name without TLD for comparison
    const domainName = normalizedDomain.substring(0, normalizedDomain.lastIndexOf('.'))
    
    for (const brand of HIGH_VALUE_BRANDS) {
      // Skip exact matches - legitimate domains shouldn't be flagged as typosquatting
      if (domainName === brand) {
        continue
      }
      
      const similarity = this.calculateLevenshteinSimilarity(domainName, brand)
      
      // If domain is very similar to a high-value brand but not exact match
      if (similarity > 0.7 && similarity < 1.0) {
        return true
      }
      
      // Check for common typosquatting patterns
      if (this.isTyposquatPattern(domainName, brand)) {
        return true
      }
    }

    return false
  }

  /**
   * Check for common typosquatting patterns
   */
  private isTyposquatPattern(domain: string, brand: string): boolean {
    // Character substitution (paypal -> payp4l)
    if (this.hasCharacterSubstitution(domain, brand)) return true
    
    // Character insertion (paypal -> payypal)
    if (this.hasCharacterInsertion(domain, brand)) return true
    
    // Character deletion (paypal -> paypl)
    if (this.hasCharacterDeletion(domain, brand)) return true
    
    // Domain addition (paypal -> paypal-secure)
    if (domain.includes(brand) && domain !== brand) return true

    return false
  }

  /**
   * Detect suspicious TLD usage
   */
  private detectSuspiciousTLD(domain: string): boolean {
    const tld = domain.substring(domain.lastIndexOf('.'))
    return SUSPICIOUS_TLDS.has(tld)
  }

  /**
   * Detect phishing patterns in URL path
   */
  private detectPhishingPatterns(pathname: string, fullUrl: string): boolean {
    // Check path patterns
    for (const pattern of PHISHING_PATH_PATTERNS) {
      if (pattern.test(pathname)) return true
    }

    // Check parameter patterns
    const urlObj = new URL(fullUrl)
    for (const [key, value] of urlObj.searchParams) {
      const param = `${key}=${value}`
      for (const pattern of SUSPICIOUS_PARAM_PATTERNS) {
        if (pattern.test(param)) return true
      }
    }

    return false
  }

  /**
   * Detect URL obfuscation techniques
   */
  private detectObfuscation(url: string): boolean {
    for (const pattern of OBFUSCATION_PATTERNS) {
      if (pattern.test(url)) return true
    }
    return false
  }

  /**
   * Detect brand impersonation attempts
   */
  private detectBrandImpersonation(domain: string): { likelyTarget: string; confidence: number } | undefined {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
    // Extract just the domain name without TLD for comparison
    const domainName = normalizedDomain.substring(0, normalizedDomain.lastIndexOf('.'))
    
    let bestMatch = { brand: '', confidence: 0 }
    
    for (const brand of HIGH_VALUE_BRANDS) {
      // Skip exact matches - legitimate domains shouldn't be flagged as impersonation
      if (domainName === brand) {
        continue
      }
      
      const confidence = this.calculateBrandSimilarity(domainName, brand)
      
      if (confidence > bestMatch.confidence && confidence > 0.6) {
        bestMatch = { brand, confidence }
      }
    }

    return bestMatch.confidence > 0.6 
      ? { likelyTarget: bestMatch.brand, confidence: bestMatch.confidence }
      : undefined
  }

  /**
   * Calculate brand similarity with weighted factors
   */
  private calculateBrandSimilarity(domain: string, brand: string): number {
    // Exact substring match gets high score
    if (domain.includes(brand)) return 0.95
    
    // Levenshtein similarity
    const levenshtein = this.calculateLevenshteinSimilarity(domain, brand)
    
    // Homograph similarity
    const homograph = this.calculateHomographSimilarity(domain, brand)
    
    // Weighted combination (cap at 0.85 for non-exact matches)
    return Math.min(0.85, Math.max(levenshtein * 0.7 + homograph * 0.3, levenshtein, homograph))
  }

  /**
   * Calculate homograph similarity
   */
  private calculateHomographSimilarity(domain: string, brand: string): number {
    if (domain.length !== brand.length) return 0
    
    let matches = 0
    for (let i = 0; i < domain.length; i++) {
      const domainChar = domain[i]
      const brandChar = brand[i]
      
      if (domainChar === brandChar) {
        matches++
      } else {
        // Check if it's a homograph substitution
        const homographs = HOMOGRAPH_MAPPINGS[brandChar] || []
        if (homographs.includes(domainChar)) {
          matches += 0.8 // Partial match for homograph
        }
      }
    }
    
    return matches / domain.length
  }

  /**
   * Check for character substitution patterns
   */
  private hasCharacterSubstitution(domain: string, brand: string): boolean {
    if (Math.abs(domain.length - brand.length) > 1) return false
    
    let differences = 0
    const minLength = Math.min(domain.length, brand.length)
    
    for (let i = 0; i < minLength; i++) {
      if (domain[i] !== brand[i]) {
        differences++
        if (differences > 1) return false
      }
    }
    
    return differences === 1
  }

  /**
   * Check for character insertion patterns
   */
  private hasCharacterInsertion(domain: string, brand: string): boolean {
    if (domain.length !== brand.length + 1) return false
    
    for (let i = 0; i <= brand.length; i++) {
      const modified = brand.slice(0, i) + domain[i] + brand.slice(i)
      if (modified === domain) return true
    }
    
    return false
  }

  /**
   * Check for character deletion patterns
   */
  private hasCharacterDeletion(domain: string, brand: string): boolean {
    if (domain.length !== brand.length - 1) return false
    
    for (let i = 0; i < brand.length; i++) {
      const modified = brand.slice(0, i) + brand.slice(i + 1)
      if (modified === domain) return true
    }
    
    return false
  }

  /**
   * Calculate Levenshtein similarity (0-1)
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : 1 - distance / maxLength
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Calculate overall suspicious score
   */
  private calculateSuspiciousScore(analysis: URLPatternAnalysis): number {
    let score = 0

    if (analysis.isHomograph) score += 40
    if (analysis.isTyposquat) score += 35
    if (analysis.hasSuspiciousTLD) score += 20
    if (analysis.hasPhishingPatterns) score += 25
    if (analysis.hasObfuscation) score += 15
    if (analysis.brandImpersonation && analysis.brandImpersonation.confidence > 0.8) score += 30

    return Math.min(score, 100)
  }

  /**
   * Collect detected patterns for reporting
   */
  private collectDetectedPatterns(
    analysis: URLPatternAnalysis, 
    domain: string, 
    _pathname: string, 
    _url: string
  ): string[] {
    const patterns: string[] = []

    if (analysis.isHomograph) patterns.push('homograph_attack')
    if (analysis.isTyposquat) patterns.push('typosquatting')
    if (analysis.hasSuspiciousTLD) patterns.push('suspicious_tld')
    if (analysis.hasPhishingPatterns) patterns.push('phishing_patterns')
    if (analysis.hasObfuscation) patterns.push('url_obfuscation')
    
    if (analysis.brandImpersonation) {
      patterns.push(`brand_impersonation:${analysis.brandImpersonation.likelyTarget}`)
    }

    // Add specific pattern details
    if (SUSPICIOUS_TLDS.has(domain.substring(domain.lastIndexOf('.')))) {
      patterns.push(`suspicious_tld:${domain.substring(domain.lastIndexOf('.'))}`)
    }

    return patterns
  }

  /**
   * Sanitize URL for logging (remove sensitive parameters)
   */
  private sanitizeUrlForLogging(url: string): string {
    try {
      const parsed = new URL(url)
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
    } catch {
      return url.substring(0, 50) + (url.length > 50 ? '...' : '')
    }
  }
}

/**
 * Default pattern detector instance
 */
export const defaultURLPatternDetector = new URLPatternDetector()

/**
 * Convenience function for URL pattern analysis
 */
export function analyzeURLPatterns(url: string, domain: string, pathname: string): URLPatternAnalysis {
  return defaultURLPatternDetector.analyzeURL(url, domain, pathname)
}