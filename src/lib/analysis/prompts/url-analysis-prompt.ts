/**
 * URL Analysis Prompt Template v2.0
 * Enhanced prompt for AI-powered URL risk analysis with improved accuracy
 * Optimized based on scam pattern analysis and false positive reduction
 */

import type { AIAnalysisRequest, AIPromptConfig, TechnicalAnalysisContext } from '../../../types/ai'

export const URL_ANALYSIS_PROMPT_VERSION = '2.0'

/**
 * Generate system prompt for URL analysis
 */
export function createUrlAnalysisPrompt(request: AIAnalysisRequest): string {
  const systemPrompt = `You are an expert cybersecurity analyst specializing in URL-based scam detection. Your task is to analyze URLs for scam likelihood using pattern recognition and technical indicators.

**INPUT DATA:**
URL: ${request.url}
Domain: ${request.domain}
Path: ${request.path}
Parameters: ${JSON.stringify(request.parameters)}
Technical Context: ${formatTechnicalContext(request.technicalContext)}

**ANALYSIS FRAMEWORK:**
Evaluate the URL systematically across these weighted dimensions:

1. **Domain Trust Analysis (High Weight):**
   - Exact/near matches to known brands (paypal -> payp4l, amazon -> amaz0n)
   - Suspicious TLD usage (.tk, .ml, .ga, .cf for non-legitimate services)
   - Domain age correlation with claimed legitimacy
   - Registrar reputation and privacy protection patterns
   - Subdomain abuse (secure-paypal.suspicious-domain.com)

2. **URL Structure Red Flags (High Weight):**
   - Login/credential harvesting patterns (login, signin, verify, update, confirm in paths)
   - Urgency indicators (urgent, expire, suspend, limited-time)
   - Obfuscation techniques (excessive URL encoding, IP addresses, URL shorteners)
   - Parameter injection patterns (redirect, continue, return_url pointing to external domains)

3. **Scam Pattern Matching (Critical):**
   - Financial: crypto-mining, investment schemes, fake banking, loan scams
   - Phishing: credential harvesting, account verification, security alerts
   - E-commerce: too-good-to-be-true deals, missing contact info, fake stores
   - Social Engineering: authority impersonation, fear/urgency tactics, prize claims

4. **Legitimacy Indicators (False Positive Prevention):**
   - Well-established domains (>2 years old) with clean reputation
   - Official company domains and verified subdomains
   - Educational, government, and established news domains
   - Major platform domains (github.com, stackoverflow.com, etc.)

**SCORING GUIDELINES:**
- 0-20: Legitimate services with strong trust indicators
- 21-40: Likely legitimate but with some suspicious elements
- 41-60: Uncertain/neutral - requires additional investigation
- 61-80: High probability scam with multiple red flags
- 81-100: Definitive scam patterns with high confidence

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
- Be conservative with legitimate services - err on the side of false negatives over false positives
- Weight domain age and reputation heavily for new domains
- Consider technical context indicators as strong supporting evidence
- Provide specific, observable indicators rather than generic assessments
- Use confidence scores to reflect uncertainty - lower confidence for borderline cases`

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
 * Extract examples for testing (comprehensive set for v2.0)
 */
export function getTestExamples() {
  return {
    scamUrls: [
      // Financial scams
      'http://secure-banking-update.com/login.php?redirect=paypal',
      'https://crypto-investment-2024.ml/signup?ref=urgent',
      'https://binance-rewards.tk/claim-bonus.html',
      'http://payp4l-verification.com/secure/login',
      
      // Phishing attempts
      'https://amazon-prime-renewal.tk/verify.html',
      'https://microsoft-security-alert.cf/fix-now.exe',
      'http://gmai1.com/signin?continue=https://accounts.google.com',
      'https://secure-apple-id.ml/unlock-account',
      
      // E-commerce fraud
      'https://luxury-deals-90off.ga/iphone-sale',
      'http://nike-clearance-outlet.tk/shoes',
      'https://rolex-direct-factory.cf/watches',
      
      // Social engineering
      'http://you-won-lottery.ml/claim?prize=1000000',
      'https://urgent-security-notice.tk/verify-now',
      'http://government-refund.ga/claim-tax-return',
    ],
    legitimateUrls: [
      // Established tech platforms
      'https://github.com/microsoft/vscode',
      'https://stackoverflow.com/questions/12345678',
      'https://docs.google.com/document/d/abc123',
      'https://www.npmjs.com/package/react',
      
      // E-commerce and services
      'https://www.amazon.com/dp/B08N5WRWNW',
      'https://support.apple.com/en-us/HT201236',
      'https://developer.mozilla.org/en-US/docs/Web',
      'https://www.paypal.com/us/signin',
      
      // Educational and news
      'https://en.wikipedia.org/wiki/Machine_learning',
      'https://www.bbc.com/news/technology',
      'https://www.mit.edu/academics/',
      'https://www.reuters.com/business/',
      
      // Government and official
      'https://www.irs.gov/individuals/free-tax-return-preparation',
      'https://www.usa.gov/government-benefits',
    ],
    borderlineCases: [
      // Recent legitimate domains that might trigger false positives
      'https://newstartup2024.com/about',
      'https://crypto-news-daily.net/articles',
      'https://secure-login.newbank.org/signin',
      
      // Legitimate but suspicious patterns
      'https://accounts.microsoft.com/recovery?continue=outlook.com',
      'https://signin.aws.amazon.com/oauth?redirect_uri=console',
    ]
  }
}