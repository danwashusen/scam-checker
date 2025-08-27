import { NextRequest, NextResponse } from 'next/server'
import { validateURL } from '../../../lib/validation/url-validator'
import { parseURL } from '../../../lib/validation/url-parser'
import { sanitizeURL } from '../../../lib/validation/url-sanitizer'
import { sanitizeForLogging } from '../../../lib/validation/url-sanitizer'
import { validateAnalysisRequest, formatValidationError } from '../../../lib/validation/schemas'
import { defaultWhoisService } from '../../../lib/analysis/whois-service'
import { defaultSSLService } from '../../../lib/analysis/ssl-service'
import { logger } from '../../../lib/logger'
import type { URLAnalysisResult, URLValidationOptions, SanitizationOptions } from '../../../types/url'
import type { DomainAgeAnalysis } from '../../../types/whois'
import type { SSLCertificateAnalysis } from '../../../types/ssl'

interface RiskFactor {
  type: string
  score: number
  description: string
}

interface AnalysisResult {
  url: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  factors: RiskFactor[]
  explanation: string
  timestamp: string
  domainAge?: {
    ageInDays: number | null
    registrationDate: string | null
    registrar: string | null
    analysis: DomainAgeAnalysis | null
    fromCache: boolean
    error?: string
  }
  sslCertificate?: {
    certificateType: string | null
    certificateAuthority: string | null
    daysUntilExpiry: number | null
    issuedDate: string | null
    analysis: SSLCertificateAnalysis | null
    fromCache: boolean
    error?: string
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()
  const timer = logger.timer('URL analysis request')
  
  try {
    const body = await request.json()
    
    // Validate request using comprehensive validation
    const requestValidation = validateAnalysisRequest(body)
    if (!requestValidation.success) {
      const errorMessage = formatValidationError(requestValidation.error)
      logger.warn('URL validation failed', {
        message: errorMessage,
        input: sanitizeForLogging(body?.url || 'undefined'),
        errors: requestValidation.error.errors,
      })
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid URL provided',
          message: errorMessage,
          details: requestValidation.error.errors.map(err => ({
            field: err.path.join('.') || 'url',
            message: err.message,
            code: err.code,
          })),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const { url: inputUrl, options } = requestValidation.data
    
    // Perform comprehensive URL analysis
    const urlAnalysis = await performURLAnalysis(inputUrl, options)
    
    if (!urlAnalysis.validation.isValid) {
      logger.warn('URL validation failed', {
        errorMessage: urlAnalysis.validation.error,
        input: sanitizeForLogging(inputUrl),
        errorType: urlAnalysis.validation.errorType,
      })
      
      return NextResponse.json(
        {
          success: false,
          error: 'URL validation failed',
          message: urlAnalysis.validation.error,
          errorType: urlAnalysis.validation.errorType,
          details: [{
            field: 'url',
            message: urlAnalysis.validation.error || 'URL validation failed',
            code: urlAnalysis.validation.errorType,
          }],
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Generate comprehensive analysis result including WHOIS and SSL data
    const mockResult: AnalysisResult = await generateAnalysisWithAll(urlAnalysis)
    
    const finalProcessingTime = Date.now() - requestStartTime
    
    timer.end({
      url: sanitizeForLogging(urlAnalysis.final),
      processingTime: finalProcessingTime,
      riskLevel: mockResult.riskLevel,
    })

    // Log successful analysis for monitoring
    logger.info('URL analysis completed successfully', {
      url: sanitizeForLogging(urlAnalysis.final),
      processingTime: finalProcessingTime,
      riskLevel: mockResult.riskLevel,
      riskScore: mockResult.riskScore,
      factorsCount: mockResult.factors.length,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: mockResult,
      validation: {
        original: urlAnalysis.original,
        final: urlAnalysis.final,
        wasModified: urlAnalysis.sanitization?.wasModified || false,
        changes: urlAnalysis.sanitization?.changes || [],
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Analysis API error', {
      error: error instanceof Error ? error : new Error(String(error)),
      timestamp: new Date().toISOString(),
    })
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during URL analysis',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

async function performURLAnalysis(inputUrl: string, options?: { validation?: URLValidationOptions; sanitization?: SanitizationOptions; skipSanitization?: boolean }): Promise<URLAnalysisResult> {
  const startTime = Date.now()
  
  // Step 1: Validate URL
  const validationResult = validateURL(inputUrl, options?.validation)
  
  let parsedUrl
  let sanitizationResult
  let finalUrl = inputUrl
  
  if (validationResult.isValid) {
    try {
      // Step 2: Parse URL components
      parsedUrl = parseURL(validationResult.normalizedUrl || inputUrl)
      
      // Step 3: Sanitize URL if not skipped
      if (!options?.skipSanitization) {
        sanitizationResult = sanitizeURL(validationResult.normalizedUrl || inputUrl, options?.sanitization)
        finalUrl = sanitizationResult.sanitized
      } else {
        finalUrl = validationResult.normalizedUrl || inputUrl
      }
    } catch (parseError: unknown) {
      logger.warn('URL parsing failed', {
        error: parseError instanceof Error ? parseError : new Error(String(parseError)),
        input: sanitizeForLogging(inputUrl),
      })
      // Continue with validation result if parsing fails
      finalUrl = validationResult.normalizedUrl || inputUrl
    }
  }
  
  const processingTime = Date.now() - startTime
  
  return {
    original: inputUrl,
    validation: validationResult,
    parsed: parsedUrl,
    sanitization: sanitizationResult,
    final: finalUrl,
    metadata: {
      timestamp: new Date().toISOString(),
      processingTimeMs: processingTime,
      version: '1.0.0',
    },
  }
}

async function generateAnalysisWithAll(analysis: URLAnalysisResult): Promise<AnalysisResult> {
  const { parsed, sanitization } = analysis
  
  // Generate risk factors based on URL analysis
  const factors = []
  let totalRiskScore = 0
  let domainAge: AnalysisResult['domainAge'] = undefined
  let sslCertificate: AnalysisResult['sslCertificate'] = undefined

  // Perform WHOIS analysis if we have a valid domain (not IP)
  if (parsed && !parsed.isIP) {
    try {
      const whoisResult = await defaultWhoisService.analyzeDomain(parsed)
      
      if (whoisResult.success && whoisResult.data) {
        const whoisAnalysis = whoisResult.data
        
        domainAge = {
          ageInDays: whoisAnalysis.ageInDays,
          registrationDate: whoisAnalysis.registrationDate?.toISOString() || null,
          registrar: whoisAnalysis.registrar,
          analysis: whoisAnalysis,
          fromCache: whoisResult.fromCache
        }

        // Add WHOIS-based risk factors
        whoisAnalysis.riskFactors.forEach(factor => {
          factors.push({
            type: factor.type,
            score: factor.score,
            description: factor.description
          })
          totalRiskScore += factor.score
        })

        logger.info('WHOIS analysis completed', {
          domain: parsed.domain,
          ageInDays: whoisAnalysis.ageInDays,
          registrar: whoisAnalysis.registrar,
          score: whoisAnalysis.score,
          fromCache: whoisResult.fromCache
        })
      } else {
        // WHOIS lookup failed, add fallback risk factor
        domainAge = {
          ageInDays: null,
          registrationDate: null,
          registrar: null,
          analysis: null,
          fromCache: false,
          error: whoisResult.error?.message || 'WHOIS lookup failed'
        }
        
        factors.push({
          type: 'domain-age-unknown',
          score: 0.3, // Moderate risk when we can't determine age
          description: 'Could not determine domain age from WHOIS data'
        })
        totalRiskScore += 0.3
      }
    } catch (error: unknown) {
      // Handle unexpected WHOIS errors
      domainAge = {
        ageInDays: null,
        registrationDate: null,
        registrar: null,
        analysis: null,
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unexpected WHOIS lookup error'
      }
      
      logger.warn('WHOIS lookup error', {
        domain: parsed.domain,
        error: error as Error
      })
      
      factors.push({
        type: 'domain-age-error',
        score: 0.2, // Lower risk for system errors vs unknown age
        description: 'Domain age lookup encountered an error'
      })
      totalRiskScore += 0.2
    }
  }

  // Perform SSL certificate analysis if using HTTPS
  if (parsed && !parsed.isIP && analysis.final.startsWith('https:')) {
    try {
      const sslResult = await defaultSSLService.analyzeCertificate(parsed)
      
      if (sslResult.success && sslResult.data) {
        const sslAnalysis = sslResult.data
        
        sslCertificate = {
          certificateType: sslAnalysis.certificateType,
          certificateAuthority: sslAnalysis.certificateAuthority?.name || null,
          daysUntilExpiry: sslAnalysis.daysUntilExpiry,
          issuedDate: sslAnalysis.issuedDate?.toISOString() || null,
          analysis: sslAnalysis,
          fromCache: sslResult.fromCache
        }

        // Add SSL-based risk factors
        sslAnalysis.riskFactors.forEach(factor => {
          // Convert SSL risk scores (0-100) to normalized scores (0-1)
          const normalizedScore = factor.score / 100
          factors.push({
            type: `ssl-${factor.type}`,
            score: normalizedScore,
            description: factor.description
          })
          totalRiskScore += normalizedScore
        })

        logger.info('SSL certificate analysis completed', {
          domain: parsed.domain,
          certificateType: sslAnalysis.certificateType,
          ca: sslAnalysis.certificateAuthority?.name,
          daysUntilExpiry: sslAnalysis.daysUntilExpiry,
          score: sslAnalysis.score,
          fromCache: sslResult.fromCache
        })
      } else {
        // SSL analysis failed, add fallback risk factor
        sslCertificate = {
          certificateType: null,
          certificateAuthority: null,
          daysUntilExpiry: null,
          issuedDate: null,
          analysis: null,
          fromCache: false,
          error: sslResult.error?.message || 'SSL certificate analysis failed'
        }
        
        factors.push({
          type: 'ssl-unavailable',
          score: 0.2, // Moderate risk when SSL analysis fails
          description: 'Could not analyze SSL certificate'
        })
        totalRiskScore += 0.2
      }
    } catch (error: unknown) {
      // Handle unexpected SSL errors
      sslCertificate = {
        certificateType: null,
        certificateAuthority: null,
        daysUntilExpiry: null,
        issuedDate: null,
        analysis: null,
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unexpected SSL certificate analysis error'
      }
      
      logger.warn('SSL certificate analysis error', {
        domain: parsed.domain,
        error: error as Error
      })
      
      factors.push({
        type: 'ssl-error',
        score: 0.1, // Lower risk for system errors vs unavailable SSL
        description: 'SSL certificate analysis encountered an error'
      })
      totalRiskScore += 0.1
    }
  }
  
  // Domain analysis factor
  if (parsed) {
    const domainFactor = {
      type: 'domain',
      score: parsed.isIP ? 0.3 : 0.1,
      description: parsed.isIP 
        ? 'URL uses IP address instead of domain name'
        : `Domain analysis: ${parsed.domain}`,
    }
    factors.push(domainFactor)
    totalRiskScore += domainFactor.score
    
    // Subdomain factor
    if (parsed.subdomain) {
      const subdomainFactor = {
        type: 'subdomain',
        score: parsed.subdomain.split('.').length > 2 ? 0.2 : 0.05,
        description: `Subdomain detected: ${parsed.subdomain}`,
      }
      factors.push(subdomainFactor)
      totalRiskScore += subdomainFactor.score
    }
    
    // URL depth factor
    const depth = parsed.components.pathParts.length
    if (depth > 3) {
      const depthFactor = {
        type: 'url-depth',
        score: Math.min(depth * 0.05, 0.3),
        description: `URL has ${depth} path segments`,
      }
      factors.push(depthFactor)
      totalRiskScore += depthFactor.score
    }
    
    // Query parameters factor
    if (parsed.components.queryParams.length > 5) {
      const paramsFactor = {
        type: 'query-params',
        score: 0.1,
        description: `URL contains ${parsed.components.queryParams.length} query parameters`,
      }
      factors.push(paramsFactor)
      totalRiskScore += paramsFactor.score
    }
  }
  
  // Protocol factor
  const isHTTPS = analysis.final.startsWith('https:')
  const protocolFactor = {
    type: 'protocol',
    score: isHTTPS ? 0.0 : 0.2,
    description: isHTTPS 
      ? 'URL uses secure HTTPS protocol'
      : 'URL uses unencrypted HTTP protocol',
  }
  factors.push(protocolFactor)
  totalRiskScore += protocolFactor.score
  
  // Sanitization factor
  if (sanitization?.wasModified) {
    const sanitizationFactor = {
      type: 'tracking',
      score: sanitization.changes.length * 0.05,
      description: `URL contained ${sanitization.changes.length} tracking/normalization issues`,
    }
    factors.push(sanitizationFactor)
    totalRiskScore += sanitizationFactor.score
  }
  
  // Normalize risk score (0-1 scale)
  const normalizedRiskScore = Math.min(Math.max(totalRiskScore, 0), 1)
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (normalizedRiskScore > 0.7) {
    riskLevel = 'high'
  } else if (normalizedRiskScore > 0.3) {
    riskLevel = 'medium'
  }
  
  // Generate explanation
  const explanation = generateExplanation(riskLevel, factors, analysis, domainAge, sslCertificate)
  
  return {
    url: analysis.final,
    riskScore: normalizedRiskScore,
    riskLevel,
    factors,
    explanation,
    timestamp: new Date().toISOString(),
    domainAge,
    sslCertificate,
  }
}

function generateExplanation(
  riskLevel: string, 
  factors: RiskFactor[], 
  analysis: URLAnalysisResult,
  domainAge?: AnalysisResult['domainAge'],
  sslCertificate?: AnalysisResult['sslCertificate']
): string {
  const positiveFactors = factors.filter(f => f.score === 0)
  const negativeFactors = factors.filter(f => f.score > 0)
  
  let explanation = `This URL has been classified as ${riskLevel} risk. `
  
  if (riskLevel === 'low') {
    explanation += 'The URL appears to be safe based on our analysis. '
    if (positiveFactors.length > 0) {
      explanation += 'Positive indicators include secure protocol usage and legitimate domain structure. '
    }
  } else if (riskLevel === 'medium') {
    explanation += 'The URL shows some potential risk indicators that warrant caution. '
  } else {
    explanation += 'The URL exhibits multiple risk factors and should be approached with extreme caution. '
  }
  
  // Add domain age context
  if (domainAge?.analysis) {
    const ageInDays = domainAge.analysis.ageInDays
    if (ageInDays !== null) {
      if (ageInDays < 30) {
        explanation += `The domain was registered very recently (${ageInDays} days ago), which increases risk. `
      } else if (ageInDays < 365) {
        explanation += `The domain was registered ${ageInDays} days ago. `
      } else {
        const years = Math.round(ageInDays / 365 * 10) / 10
        explanation += `The domain has been registered for ${years} years, indicating established presence. `
      }
    }
    
    if (domainAge.analysis.privacyProtected) {
      explanation += 'The domain uses privacy protection which may obscure ownership details. '
    }
  } else if (domainAge?.error) {
    explanation += 'Domain age analysis was not available due to WHOIS lookup limitations. '
  }

  // Add SSL certificate context
  if (sslCertificate?.analysis) {
    const ssl = sslCertificate.analysis
    if (ssl.daysUntilExpiry !== null) {
      if (ssl.daysUntilExpiry < 0) {
        explanation += 'The SSL certificate has expired, which is a significant security risk. '
      } else if (ssl.daysUntilExpiry <= 30) {
        explanation += `The SSL certificate expires in ${ssl.daysUntilExpiry} days. `
      } else {
        explanation += `The SSL certificate is valid for ${ssl.daysUntilExpiry} more days. `
      }
    }
    
    if (ssl.certificateType === 'self-signed') {
      explanation += 'The site uses a self-signed SSL certificate, which increases security risk. '
    } else if (ssl.certificateType === 'EV') {
      explanation += 'The site uses an Extended Validation SSL certificate, indicating higher trust. '
    }
    
    if (ssl.certificateAge !== null && ssl.certificateAge <= 30) {
      explanation += 'The SSL certificate was issued very recently, which may indicate a new or potentially suspicious site. '
    }
  } else if (sslCertificate?.error && analysis.final.startsWith('https:')) {
    explanation += 'SSL certificate analysis was not available, which may indicate connection or certificate issues. '
  }
  
  if (negativeFactors.length > 0) {
    const topRisks = negativeFactors
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(f => f.description.toLowerCase())
      .join(' and ')
    explanation += `Key concerns include: ${topRisks}. `
  }
  
  if (analysis.sanitization?.wasModified) {
    explanation += `The URL was modified during processing to remove ${analysis.sanitization.changes.length} tracking/normalization issue(s). `
  }
  
  explanation += 'This analysis is preliminary and additional verification may be needed for security-critical applications.'
  
  return explanation
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'URL Analysis API',
      version: '1.0.0',
      endpoints: {
        analyze: {
          method: 'POST',
          description: 'Analyze a URL for potential security risks with comprehensive validation',
          body: {
            url: 'string (required) - The URL to analyze',
            options: {
              validation: {
                allowedProtocols: 'string[] (optional) - Allowed protocols (default: ["http:", "https:"])',
                maxLength: 'number (optional) - Maximum URL length (default: 2083)',
                allowPrivateIPs: 'boolean (optional) - Allow private IP addresses (default: false)',
                allowLocalhost: 'boolean (optional) - Allow localhost addresses (default: false)',
              },
              sanitization: {
                removeTrackingParams: 'boolean (optional) - Remove tracking parameters (default: true)',
                upgradeProtocol: 'boolean (optional) - Upgrade HTTP to HTTPS (default: true)',
                removeFragments: 'boolean (optional) - Remove URL fragments (default: false)',
                normalizeEncoding: 'boolean (optional) - Normalize URL encoding (default: true)',
                normalizeCase: 'boolean (optional) - Normalize case (default: true)',
                removeWww: 'boolean (optional) - Remove www subdomain (default: false)',
                customTrackingParams: 'string[] (optional) - Additional tracking parameters to remove',
              },
              skipValidation: 'boolean (optional) - Skip URL validation (default: false)',
              skipSanitization: 'boolean (optional) - Skip URL sanitization (default: false)',
            },
          },
        },
      },
      features: [
        'Comprehensive URL validation with security checks',
        'URL parsing and component extraction',
        'URL sanitization and normalization',
        'Tracking parameter removal',
        'Risk assessment based on URL characteristics',
        'Domain age analysis via WHOIS data',
        'SSL/TLS certificate security analysis',
        'Cached WHOIS lookups for performance',
        'Domain registration pattern analysis',
        'Registrar reputation scoring',
        'Privacy protection detection',
        'Detailed logging and error reporting',
      ],
      security: {
        'SSRF Protection': 'Blocks private IP addresses and localhost by default',
        'Input Validation': 'Comprehensive validation prevents malicious input',
        'XSS Prevention': 'All inputs are sanitized and validated',
        'Logging': 'Sensitive information is redacted from logs',
      },
    },
    { status: 200 }
  )
}