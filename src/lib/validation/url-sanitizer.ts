import { URL } from 'url'
import { parseURL, type ParsedURL } from './url-parser'

export interface URLSanitizationResult {
  original: string
  sanitized: string
  changes: Array<{
    type: 'tracking-removed' | 'protocol-upgraded' | 'fragment-removed' | 'encoding-normalized' | 'case-normalized'
    description: string
    before?: string
    after?: string
  }>
  wasModified: boolean
}

export interface SanitizationOptions {
  removeTrackingParams?: boolean
  upgradeProtocol?: boolean
  removeFragments?: boolean
  normalizeEncoding?: boolean
  normalizeCase?: boolean
  removeWww?: boolean
  customTrackingParams?: string[]
}

const DEFAULT_SANITIZATION_OPTIONS: Required<SanitizationOptions> = {
  removeTrackingParams: true,
  upgradeProtocol: true,
  removeFragments: false, // Keep fragments for analysis by default
  normalizeEncoding: true,
  normalizeCase: true,
  removeWww: false,
  customTrackingParams: [],
}

// Common tracking parameters to remove
const TRACKING_PARAMETERS = [
  // Google Analytics
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  
  // Facebook
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
  
  // Twitter
  'twclid', 'twttr', 'twitter_impression',
  
  // LinkedIn
  'li_fat_id', 'lipi', 'licu',
  
  // Microsoft/Bing
  'msclkid', 'ms_c', 'ms_id',
  
  // Amazon
  'tag', 'linkCode', 'creative', 'creativeASIN', 'linkId', 'ref', 'ref_',
  
  // Email marketing
  'mc_cid', 'mc_eid', 'ml_subscriber', 'ml_subscriber_hash',
  'vero_conv', 'vero_id', '_hsenc', '_hsmi',
  
  // Adobe
  's_cid', 'adobe_mc', 'adobe_mc_ref',
  
  // Mailchimp
  'mc_cid', 'mc_eid',
  
  // HubSpot
  '_hsenc', '_hsmi', 'hsCtaTracking',
  
  // Salesforce
  'sfmc_id', 'sfmc_activityid',
  
  // Generic tracking
  'source', 'campaign', 'medium', 'content', 'term', 'tracking',
  'referrer', 'ref_src', 'campaign_id', 'ad_id', 'creative_id',
  'placement_id', 'site_id', 'gclid', 'dclid', 'gbraid', 'wbraid',
  
  // Social media
  'igshid', 'igsh', 'share', 'shared',
  
  // Other common ones
  'ncid', '_gl', '_ga', 'pk_campaign', 'pk_kwd', 'pk_source',
]

/**
 * Sanitizes a URL by removing tracking parameters and normalizing format
 */
export function sanitizeURL(input: string, options: SanitizationOptions = {}): URLSanitizationResult {
  const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options }
  const allTrackingParams = [...TRACKING_PARAMETERS, ...opts.customTrackingParams]
  
  let currentUrl = input.trim()
  const changes: URLSanitizationResult['changes'] = []

  try {
    // Parse the URL
    let url: URL
    
    // Handle URLs without protocol
    if (!/^https?:\/\//i.test(currentUrl)) {
      currentUrl = `https://${currentUrl}`
    }
    
    url = new URL(currentUrl)

    // 1. Protocol upgrade (HTTP to HTTPS)
    if (opts.upgradeProtocol && url.protocol === 'http:') {
      const originalProtocol = url.protocol
      url.protocol = 'https:'
      changes.push({
        type: 'protocol-upgraded',
        description: 'Upgraded HTTP to HTTPS',
        before: originalProtocol,
        after: url.protocol,
      })
    }

    // 2. Case normalization (hostname to lowercase)
    if (opts.normalizeCase && url.hostname !== url.hostname.toLowerCase()) {
      const originalHostname = url.hostname
      url.hostname = url.hostname.toLowerCase()
      changes.push({
        type: 'case-normalized',
        description: 'Normalized hostname to lowercase',
        before: originalHostname,
        after: url.hostname,
      })
    }

    // 3. Remove www subdomain if requested
    if (opts.removeWww && url.hostname.startsWith('www.')) {
      const originalHostname = url.hostname
      url.hostname = url.hostname.slice(4)
      changes.push({
        type: 'case-normalized',
        description: 'Removed www subdomain',
        before: originalHostname,
        after: url.hostname,
      })
    }

    // 4. Remove tracking parameters
    if (opts.removeTrackingParams) {
      const originalParams = Array.from(url.searchParams.entries())
      let removedCount = 0

      for (const param of allTrackingParams) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param)
          removedCount++
        }
      }

      if (removedCount > 0) {
        changes.push({
          type: 'tracking-removed',
          description: `Removed ${removedCount} tracking parameter(s)`,
          before: `${originalParams.length} parameters`,
          after: `${url.searchParams.size} parameters`,
        })
      }
    }

    // 5. Remove fragments if requested
    if (opts.removeFragments && url.hash) {
      const originalHash = url.hash
      url.hash = ''
      changes.push({
        type: 'fragment-removed',
        description: 'Removed URL fragment',
        before: originalHash,
        after: '',
      })
    }

    // 6. Normalize encoding
    if (opts.normalizeEncoding) {
      const originalHref = url.href
      
      // Decode and re-encode pathname
      try {
        const decodedPath = decodeURIComponent(url.pathname)
        const reEncodedPath = encodeURI(decodedPath)
        
        if (url.pathname !== reEncodedPath) {
          url.pathname = reEncodedPath
          changes.push({
            type: 'encoding-normalized',
            description: 'Normalized URL encoding',
            before: 'encoded characters',
            after: 'normalized encoding',
          })
        }
      } catch (error) {
        // Skip encoding normalization if decoding fails
      }
    }

    const sanitizedUrl = url.href
    const wasModified = changes.length > 0

    return {
      original: input.trim(),
      sanitized: sanitizedUrl,
      changes,
      wasModified,
    }

  } catch (error) {
    // If URL parsing fails, return original with no changes
    return {
      original: input.trim(),
      sanitized: input.trim(),
      changes: [],
      wasModified: false,
    }
  }
}

/**
 * Removes only tracking parameters from a URL
 */
export function removeTrackingParams(input: string, customParams: string[] = []): string {
  const result = sanitizeURL(input, {
    removeTrackingParams: true,
    upgradeProtocol: false,
    removeFragments: false,
    normalizeEncoding: false,
    normalizeCase: false,
    removeWww: false,
    customTrackingParams: customParams,
  })
  
  return result.sanitized
}

/**
 * Normalizes a URL for consistent comparison and analysis
 */
export function normalizeURLForAnalysis(input: string): string {
  const result = sanitizeURL(input, {
    removeTrackingParams: true,
    upgradeProtocol: false, // Keep original protocol for analysis
    removeFragments: true,   // Remove fragments for analysis
    normalizeEncoding: true,
    normalizeCase: true,
    removeWww: false, // Keep www for domain analysis
    customTrackingParams: [],
  })
  
  return result.sanitized
}

/**
 * Gets a clean version of URL suitable for display
 */
export function getDisplayURL(input: string): string {
  try {
    const parsed = parseURL(input)
    const portStr = parsed.port ? `:${parsed.port}` : ''
    const url = new URL(parsed.protocol === 'https:' ? 
      `https://${parsed.hostname}${portStr}${parsed.pathname}${parsed.search}` :
      `http://${parsed.hostname}${portStr}${parsed.pathname}${parsed.search}`
    )
    
    // Remove default ports
    if ((url.protocol === 'https:' && url.port === '443') ||
        (url.protocol === 'http:' && url.port === '80')) {
      url.port = ''
    }
    
    return url.href
  } catch (error) {
    return input.trim()
  }
}

/**
 * Removes sensitive information from URL for logging
 */
export function sanitizeForLogging(input: string): string {
  try {
    const url = new URL(input)
    
    // Remove sensitive query parameters
    const sensitiveParams = [
      'password', 'passwd', 'pwd', 'token', 'key', 'secret',
      'api_key', 'apikey', 'auth', 'authorization', 'session',
      'sid', 'sessionid', 'csrf', 'email', 'user', 'username',
    ]
    
    for (const param of sensitiveParams) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, '[REDACTED]')
      }
    }
    
    return url.href
  } catch (error) {
    return '[INVALID_URL]'
  }
}

/**
 * Checks if a URL has tracking parameters
 */
export function hasTrackingParams(input: string, customParams: string[] = []): boolean {
  try {
    const url = new URL(input)
    const allTrackingParams = [...TRACKING_PARAMETERS, ...customParams]
    
    return allTrackingParams.some(param => url.searchParams.has(param))
  } catch (error) {
    return false
  }
}

/**
 * Gets all tracking parameters found in a URL
 */
export function getTrackingParams(input: string, customParams: string[] = []): Record<string, string> {
  try {
    const url = new URL(input)
    const allTrackingParams = [...TRACKING_PARAMETERS, ...customParams]
    const trackingParams: Record<string, string> = {}
    
    for (const param of allTrackingParams) {
      const value = url.searchParams.get(param)
      if (value !== null) {
        trackingParams[param] = value
      }
    }
    
    return trackingParams
  } catch (error) {
    return {}
  }
}

/**
 * Creates a canonical URL for deduplication purposes
 */
export function getCanonicalURL(input: string): string {
  const result = sanitizeURL(input, {
    removeTrackingParams: true,
    upgradeProtocol: true,
    removeFragments: true,
    normalizeEncoding: true,
    normalizeCase: true,
    removeWww: true,
    customTrackingParams: [],
  })
  
  return result.sanitized
}