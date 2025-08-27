import type { 
  WhoisData, 
  DomainAgeAnalysis, 
  WhoisDateFormat,
  RegistrarInfo,
  PrivacyProtection,
  DomainAgeRisk,
  WhoisMetadata
} from '../../types/whois'

/**
 * WHOIS response parser that handles multiple formats and extracts key domain information
 */
export class WhoisParser {
  private static readonly DATE_PATTERNS = {
    iso: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/,
    dash: /(\d{4}-\d{2}-\d{2})/,
    us: /(\d{1,2}\/\d{1,2}\/\d{4})/,
    eu: /(\d{1,2}\/\d{1,2}\/\d{4})/,
    dot: /(\d{1,2}\.\d{1,2}\.\d{4})/,
    text: /(\d{1,2}-[A-Za-z]{3}-\d{4})/,
  }

  private static readonly PRIVACY_INDICATORS = [
    'privacy',
    'redacted',
    'whoisguard',
    'whoisprotect',
    'domains by proxy',
    'contact privacy',
    'private registration',
    'redacted for privacy',
    'data protected',
    'not disclosed'
  ]

  private static readonly KNOWN_REGISTRARS = new Map<string, RegistrarInfo>([
    ['godaddy', { name: 'GoDaddy', normalized: 'godaddy', trustScore: 0.8, knownForScams: false, registrationVolume: 'high' }],
    ['namecheap', { name: 'Namecheap', normalized: 'namecheap', trustScore: 0.9, knownForScams: false, registrationVolume: 'high' }],
    ['cloudflare', { name: 'Cloudflare', normalized: 'cloudflare', trustScore: 0.95, knownForScams: false, registrationVolume: 'medium' }],
    ['google domains', { name: 'Google Domains', normalized: 'google', trustScore: 0.95, knownForScams: false, registrationVolume: 'medium' }],
    ['amazon registrar', { name: 'Amazon Registrar', normalized: 'amazon', trustScore: 0.9, knownForScams: false, registrationVolume: 'low' }],
  ])

  /**
   * Parse raw WHOIS response into structured domain analysis
   */
  static parseWhoisResponse(
    domain: string,
    rawResponse: string,
    metadata?: Partial<WhoisMetadata>
  ): DomainAgeAnalysis {
    const whoisData = this.extractWhoisData(rawResponse)
    return this.analyzeDomainData(domain, whoisData, metadata)
  }

  /**
   * Extract structured data from raw WHOIS response
   */
  private static extractWhoisData(rawResponse: string): WhoisData {
    const lines = rawResponse.toLowerCase().split('\n')
    const parsed: WhoisData['parsed'] = {}

    // Extract dates
    parsed.creationDate = this.extractDate(rawResponse, ['creation date', 'created', 'registered', 'domain registration date']) || null
    parsed.expirationDate = this.extractDate(rawResponse, ['expiry date', 'expires', 'expiration date', 'registry expiry date']) || null
    parsed.updatedDate = this.extractDate(rawResponse, ['updated date', 'modified', 'last modified', 'last updated']) || null

    // Extract registrar
    parsed.registrar = this.extractField(rawResponse, ['registrar:', 'sponsoring registrar:', 'registrar name:'])

    // Extract nameservers
    parsed.nameservers = this.extractNameservers(rawResponse)

    // Extract status
    parsed.status = this.extractStatuses(rawResponse)

    // Extract contact information
    parsed.registrant = this.extractContact(rawResponse, 'registrant')
    parsed.admin = this.extractContact(rawResponse, 'admin')
    parsed.tech = this.extractContact(rawResponse, 'tech')

    return {
      raw: rawResponse,
      parsed
    }
  }

  /**
   * Analyze extracted WHOIS data and calculate risk scores
   */
  private static analyzeDomainData(
    domain: string,
    whoisData: WhoisData,
    metadata?: Partial<WhoisMetadata>
  ): DomainAgeAnalysis {
    const parsed = whoisData.parsed || {}
    
    // Parse dates
    const registrationDate = parsed.creationDate ? this.parseDate(parsed.creationDate) : null
    const expirationDate = parsed.expirationDate ? this.parseDate(parsed.expirationDate) : null
    const updatedDate = parsed.updatedDate ? this.parseDate(parsed.updatedDate) : null

    // Calculate age in days
    const ageInDays = registrationDate 
      ? Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Detect privacy protection
    const privacyProtected = this.detectPrivacyProtection(whoisData.raw)

    // Extract registrant country
    const registrantCountry = parsed.registrant?.country || null

    // Calculate risk factors
    const riskFactors = this.calculateRiskFactors(
      ageInDays,
      parsed.registrar || null,
      privacyProtected,
      registrantCountry,
      parsed.status || []
    )

    // Calculate overall score and confidence
    const { score, confidence } = this.calculateScoreAndConfidence(riskFactors, ageInDays !== null)

    return {
      ageInDays,
      registrationDate,
      expirationDate,
      updatedDate,
      registrar: parsed.registrar || null,
      nameservers: parsed.nameservers || [],
      status: parsed.status || [],
      score,
      confidence,
      privacyProtected,
      registrantCountry,
      riskFactors
    }
  }

  /**
   * Extract date from WHOIS response
   */
  private static extractDate(response: string, fieldNames: string[]): string | null {
    const lines = response.split('\n')
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim()
      
      for (const fieldName of fieldNames) {
        if (lowerLine.startsWith(fieldName)) {
          const dateStr = line.split(':')[1]?.trim()
          if (dateStr) {
            return dateStr
          }
        }
      }
    }
    
    return null
  }

  /**
   * Extract field value from WHOIS response
   */
  private static extractField(response: string, fieldNames: string[]): string | null {
    const lines = response.split('\n')
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim()
      
      for (const fieldName of fieldNames) {
        if (lowerLine.startsWith(fieldName)) {
          const value = line.split(':').slice(1).join(':').trim()
          if (value) {
            return value
          }
        }
      }
    }
    
    return null
  }

  /**
   * Extract nameservers from WHOIS response
   */
  private static extractNameservers(response: string): string[] {
    const nameservers: string[] = []
    const lines = response.split('\n')
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim()
      
      if (lowerLine.startsWith('name server:') || 
          lowerLine.startsWith('nameserver:') || 
          lowerLine.startsWith('nserver:')) {
        const ns = line.split(':')[1]?.trim()
        if (ns && !nameservers.includes(ns)) {
          nameservers.push(ns)
        }
      }
    }
    
    return nameservers
  }

  /**
   * Extract domain statuses from WHOIS response
   */
  private static extractStatuses(response: string): string[] {
    const statuses: string[] = []
    const lines = response.split('\n')
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim()
      
      if (lowerLine.startsWith('status:') || lowerLine.startsWith('domain status:')) {
        const status = line.split(':')[1]?.trim()
        if (status && !statuses.includes(status)) {
          statuses.push(status)
        }
      }
    }
    
    return statuses
  }

  /**
   * Extract contact information from WHOIS response
   */
  private static extractContact(response: string, contactType: 'registrant' | 'admin' | 'tech'): any {
    const contact: any = {}
    const lines = response.split('\n')
    
    const prefix = contactType === 'registrant' ? 'registrant' : 
                   contactType === 'admin' ? 'admin' : 'tech'
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim()
      
      if (lowerLine.startsWith(`${prefix} organization:`)) {
        contact.organization = line.split(':')[1]?.trim()
      } else if (lowerLine.startsWith(`${prefix} country:`)) {
        contact.country = line.split(':')[1]?.trim()
      }
    }
    
    return Object.keys(contact).length > 0 ? contact : null
  }

  /**
   * Parse date string in various formats
   */
  private static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null

    // Try different date formats
    for (const [format, pattern] of Object.entries(this.DATE_PATTERNS)) {
      const match = dateStr.match(pattern)
      if (match) {
        const date = new Date(match[1])
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }

    // Fallback to native Date parsing
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  }

  /**
   * Detect privacy protection based on response content
   */
  private static detectPrivacyProtection(response: string): boolean {
    const lowerResponse = response.toLowerCase()
    
    return this.PRIVACY_INDICATORS.some(indicator => 
      lowerResponse.includes(indicator)
    )
  }

  /**
   * Calculate risk factors based on domain analysis
   */
  private static calculateRiskFactors(
    ageInDays: number | null,
    registrar: string | null,
    privacyProtected: boolean,
    registrantCountry: string | null,
    statuses: string[]
  ): DomainAgeAnalysis['riskFactors'] {
    const factors: DomainAgeAnalysis['riskFactors'] = []

    // Age-based risk
    if (ageInDays !== null) {
      if (ageInDays < 30) {
        factors.push({
          type: 'age',
          description: `Domain is very new (${ageInDays} days old)`,
          score: 0.8
        })
      } else if (ageInDays < 90) {
        factors.push({
          type: 'age',
          description: `Domain is new (${ageInDays} days old)`,
          score: 0.6
        })
      } else if (ageInDays < 365) {
        factors.push({
          type: 'age',
          description: `Domain is recent (${ageInDays} days old)`,
          score: 0.4
        })
      } else if (ageInDays < 730) {
        factors.push({
          type: 'age',
          description: `Domain is established (${Math.round(ageInDays / 365 * 10) / 10} years old)`,
          score: 0.2
        })
      } else {
        factors.push({
          type: 'age',
          description: `Domain is mature (${Math.round(ageInDays / 365 * 10) / 10} years old)`,
          score: 0.1
        })
      }
    }

    // Privacy protection risk
    if (privacyProtected) {
      factors.push({
        type: 'privacy',
        description: 'Domain registration uses privacy protection',
        score: 0.3
      })
    }

    // Registrar risk
    if (registrar) {
      const normalizedRegistrar = registrar.toLowerCase()
      const registrarInfo = Array.from(this.KNOWN_REGISTRARS.entries())
        .find(([key]) => normalizedRegistrar.includes(key))

      if (registrarInfo) {
        const [, info] = registrarInfo
        const riskScore = 1 - info.trustScore
        factors.push({
          type: 'registrar',
          description: `Registered with ${info.name} (trust score: ${info.trustScore})`,
          score: riskScore * 0.2 // Scale down registrar impact
        })
      } else {
        factors.push({
          type: 'registrar',
          description: 'Unknown or less common registrar',
          score: 0.2
        })
      }
    }

    // Status-based risk
    const suspiciousStatuses = ['clientHold', 'serverHold', 'redemptionPeriod', 'pendingDelete']
    const hasSuspiciousStatus = statuses.some(status => 
      suspiciousStatuses.some(suspicious => status.toLowerCase().includes(suspicious.toLowerCase()))
    )
    
    if (hasSuspiciousStatus) {
      factors.push({
        type: 'status',
        description: 'Domain has suspicious status flags',
        score: 0.7
      })
    }

    return factors
  }

  /**
   * Calculate overall risk score and confidence
   */
  private static calculateScoreAndConfidence(
    riskFactors: DomainAgeAnalysis['riskFactors'],
    hasAgeData: boolean
  ): { score: number; confidence: number } {
    // Calculate weighted risk score
    const totalScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0)
    const score = Math.min(Math.max(totalScore, 0), 1) // Clamp between 0-1

    // Calculate confidence based on data availability
    let confidence = 0.5 // Base confidence
    
    if (hasAgeData) confidence += 0.3
    if (riskFactors.some(f => f.type === 'registrar')) confidence += 0.1
    if (riskFactors.some(f => f.type === 'privacy')) confidence += 0.1
    
    confidence = Math.min(confidence, 1) // Clamp to max 1.0

    return { score, confidence }
  }

  /**
   * Determine domain age risk category
   */
  static getDomainAgeRisk(ageInDays: number | null): DomainAgeRisk {
    if (ageInDays === null) return 'recent' // Unknown age treated as moderate risk
    
    if (ageInDays < 30) return 'very_new'
    if (ageInDays < 90) return 'new'
    if (ageInDays < 365) return 'recent'
    if (ageInDays < 730) return 'established'
    return 'mature'
  }
}