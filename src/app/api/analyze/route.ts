import { NextRequest, NextResponse } from 'next/server'
import { validateURL } from '../../../lib/validation/url-validator'
import { parseURL } from '../../../lib/validation/url-parser'
import { sanitizeURL } from '../../../lib/validation/url-sanitizer'
import { sanitizeForLogging } from '../../../lib/validation/url-sanitizer'
import { validateAnalysisRequest, formatValidationError } from '../../../lib/validation/schemas'
import type { URLAnalysisResult, URLValidationError } from '../../../types/url'

interface AnalysisResult {
  url: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  factors: Array<{
    type: string
    score: number
    description: string
  }>
  explanation: string
  timestamp: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    
    // Validate request using comprehensive validation
    const requestValidation = validateAnalysisRequest(body)
    if (!requestValidation.success) {
      const errorMessage = formatValidationError(requestValidation.error)
      console.warn(`URL validation failed: ${errorMessage}`, {
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
      console.warn(`URL validation failed: ${urlAnalysis.validation.error}`, {
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

    // Generate mock analysis result using validated and parsed URL data
    const mockResult: AnalysisResult = generateMockAnalysis(urlAnalysis)
    
    console.info(`URL analysis completed successfully`, {
      url: sanitizeForLogging(urlAnalysis.final),
      processingTime: urlAnalysis.metadata.processingTimeMs,
      riskLevel: mockResult.riskLevel,
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
    const processingTime = Date.now() - startTime
    console.error('Analysis API error:', error, {
      processingTime,
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

async function performURLAnalysis(inputUrl: string, options?: any): Promise<URLAnalysisResult> {
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
    } catch (parseError) {
      console.warn(`URL parsing failed: ${parseError}`, {
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

function generateMockAnalysis(analysis: URLAnalysisResult): AnalysisResult {
  const { parsed, validation, sanitization } = analysis
  
  // Generate risk factors based on URL analysis
  const factors = []
  let totalRiskScore = 0
  
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
  const explanation = generateExplanation(riskLevel, factors, analysis)
  
  return {
    url: analysis.final,
    riskScore: normalizedRiskScore,
    riskLevel,
    factors,
    explanation,
    timestamp: new Date().toISOString(),
  }
}

function generateExplanation(riskLevel: string, factors: any[], analysis: URLAnalysisResult): string {
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