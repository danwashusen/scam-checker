/**
 * URL Analysis Prompt Template v1.0
 * Basic prompt for AI-powered URL risk analysis
 * Note: This is intentionally NOT optimized - will be refined later
 */

import type { AIAnalysisRequest, AIPromptConfig, TechnicalAnalysisContext } from '../../../types/ai'

export const URL_ANALYSIS_PROMPT_VERSION = '1.0'

/**
 * Generate system prompt for URL analysis
 */
export function createUrlAnalysisPrompt(request: AIAnalysisRequest): string {
  const systemPrompt = `You are an expert cybersecurity analyst specializing in URL-based scam detection. Analyze the provided URL for scam likelihood and risk patterns.

**INPUT DATA:**
URL: ${request.url}
Domain: ${request.domain}
Path: ${request.path}
Parameters: ${JSON.stringify(request.parameters)}
Technical Context: ${formatTechnicalContext(request.technicalContext)}

**ANALYSIS FRAMEWORK:**
Evaluate the URL across these dimensions:

1. **Domain Analysis:**
   - Homograph/typosquatting attacks
   - Suspicious TLD usage
   - Domain age and reputation indicators
   - Brand impersonation patterns

2. **URL Structure Analysis:**
   - Suspicious path patterns
   - Parameter manipulation indicators
   - Redirect/shortener usage
   - Obfuscation techniques

3. **Scam Category Assessment:**
   - Financial scams (crypto, investment, loans)
   - Phishing attempts (banking, social, government)
   - E-commerce fraud (fake stores, deals)
   - Social engineering patterns

**OUTPUT REQUIREMENTS:**
Respond ONLY with valid JSON in this exact format:
{
  "risk_score": <integer 0-100>,
  "confidence": <integer 0-100>,
  "primary_risks": ["<risk1>", "<risk2>", "<risk3>"],
  "scam_category": "<financial|phishing|ecommerce|social_engineering|legitimate>",
  "indicators": ["<indicator1>", "<indicator2>", "<indicator3>"],
  "explanation": "<brief 1-2 sentence explanation>"
}

**CRITICAL INSTRUCTIONS:**
- Base analysis primarily on URL structure and domain patterns
- Consider technical context from previous analysis stages
- Prioritize high-confidence assessments over uncertain scores
- Flag legitimate services accurately to minimize false positives
- Provide specific, actionable indicators in your response`

  return systemPrompt
}

/**
 * Format technical context for the prompt
 */
function formatTechnicalContext(context: TechnicalAnalysisContext): string {
  const formatted: string[] = []

  if (context.domainAge) {
    formatted.push(`Domain Age: ${context.domainAge.ageInDays} days, Registrar: ${context.domainAge.registrar}`)
  }

  if (context.sslCertificate) {
    formatted.push(`SSL: ${context.sslCertificate.certificateType}, CA: ${context.sslCertificate.certificateAuthority}, Expires in: ${context.sslCertificate.daysUntilExpiry} days`)
  }

  if (context.reputation) {
    formatted.push(`Reputation: ${context.reputation.isClean ? 'Clean' : 'Flagged'}, Risk: ${context.reputation.riskLevel}, Threats: ${context.reputation.threatTypes.join(', ')}`)
  }

  formatted.push(`URL Structure: ${context.urlStructure.isIP ? 'IP Address' : 'Domain'}, HTTPS: ${context.urlStructure.hasHttps}, Path Depth: ${context.urlStructure.pathDepth}, Params: ${context.urlStructure.queryParamCount}`)

  return formatted.join(' | ')
}

/**
 * Generate cache key for the analysis request
 */
export function generateCacheKey(request: AIAnalysisRequest): string {
  // Create a deterministic cache key based on URL and relevant context
  const contextHash = hashTechnicalContext(request.technicalContext)
  return `url:${request.url}:context:${contextHash}:v${URL_ANALYSIS_PROMPT_VERSION}`
}

/**
 * Create a simple hash of technical context for cache key
 */
function hashTechnicalContext(context: TechnicalAnalysisContext): string {
  // Simple hash based on key context elements
  const elements = [
    context.domainAge?.ageInDays || 'unknown',
    context.sslCertificate?.certificateType || 'none',
    context.reputation?.isClean ? 'clean' : 'flagged',
    context.urlStructure.isIP ? 'ip' : 'domain',
    context.urlStructure.hasHttps ? 'https' : 'http',
    context.urlStructure.pathDepth,
    context.urlStructure.queryParamCount,
  ]
  
  return elements.join('-')
}

/**
 * Validate AI response format
 */
export function validateAIResponse(response: string): { valid: boolean; error?: string } {
  try {
    const parsed = JSON.parse(response)
    
    // Check required fields
    const required = ['risk_score', 'confidence', 'primary_risks', 'scam_category', 'indicators', 'explanation']
    for (const field of required) {
      if (!(field in parsed)) {
        return { valid: false, error: `Missing required field: ${field}` }
      }
    }

    // Validate field types and ranges
    if (typeof parsed.risk_score !== 'number' || parsed.risk_score < 0 || parsed.risk_score > 100) {
      return { valid: false, error: 'risk_score must be a number between 0-100' }
    }

    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
      return { valid: false, error: 'confidence must be a number between 0-100' }
    }

    if (!Array.isArray(parsed.primary_risks)) {
      return { valid: false, error: 'primary_risks must be an array' }
    }

    if (!Array.isArray(parsed.indicators)) {
      return { valid: false, error: 'indicators must be an array' }
    }

    const validCategories = ['financial', 'phishing', 'ecommerce', 'social_engineering', 'legitimate']
    if (!validCategories.includes(parsed.scam_category)) {
      return { valid: false, error: `scam_category must be one of: ${validCategories.join(', ')}` }
    }

    if (typeof parsed.explanation !== 'string' || parsed.explanation.length < 10) {
      return { valid: false, error: 'explanation must be a string with at least 10 characters' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Get prompt configuration
 */
export function getPromptConfig(): AIPromptConfig {
  return {
    version: URL_ANALYSIS_PROMPT_VERSION,
    systemPrompt: 'URL Risk Analysis System v1.0',
    responseFormat: 'json',
    maxRetries: 2,
    cacheKey: `prompt:url-analysis:v${URL_ANALYSIS_PROMPT_VERSION}`,
  }
}

/**
 * Extract examples for testing (basic set)
 */
export function getTestExamples() {
  return {
    scamUrls: [
      'http://secure-banking-update.com/login.php?redirect=paypal',
      'https://amazon-prime-renewal.tk/verify.html',
      'http://crypto-investment-2024.ml/signup?ref=urgent',
      'https://microsoft-security-alert.cf/fix-now.exe',
    ],
    legitimateUrls: [
      'https://github.com/microsoft/vscode',
      'https://www.amazon.com/dp/B08N5WRWNW',
      'https://docs.google.com/document/d/abc123',
      'https://stackoverflow.com/questions/12345678',
    ],
  }
}