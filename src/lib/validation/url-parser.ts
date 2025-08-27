import { URL } from 'url'

export interface ParsedURL {
  original: string
  protocol: string
  hostname: string
  domain: string
  subdomain: string
  port?: number
  pathname: string
  search: string
  searchParams: Record<string, string>
  hash: string
  isIP: boolean
  isIPv4: boolean
  isIPv6: boolean
  components: {
    domainParts: string[]
    pathParts: string[]
    queryParams: Array<{ key: string; value: string }>
  }
}

/**
 * Parses a URL and extracts all relevant components
 */
export function parseURL(input: string): ParsedURL {
  // Handle URLs without protocol
  const urlInput = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`
  
  let url: URL
  try {
    url = new URL(urlInput)
  } catch {
    throw new Error(`Invalid URL format: ${input}`)
  }

  const hostname = url.hostname.toLowerCase()
  const isIPv4 = isValidIPv4(hostname)
  const isIPv6 = isValidIPv6(hostname)
  const isIP = isIPv4 || isIPv6

  // Extract domain and subdomain
  const { domain, subdomain } = extractDomainComponents(hostname, isIP)

  // Parse query parameters
  const searchParams: Record<string, string> = {}
  const queryParams: Array<{ key: string; value: string }> = []
  
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value
    queryParams.push({ key, value })
  })

  // Parse path components
  const pathParts = url.pathname
    .split('/')
    .filter(part => part.length > 0)
    .map(part => decodeURIComponent(part))

  // Parse domain parts
  const domainParts = domain.split('.').filter(part => part.length > 0)

  const parsed: ParsedURL = {
    original: input.trim(),
    protocol: url.protocol,
    hostname,
    domain,
    subdomain,
    port: url.port ? parseInt(url.port, 10) : undefined,
    pathname: url.pathname,
    search: url.search,
    searchParams,
    hash: url.hash,
    isIP,
    isIPv4,
    isIPv6,
    components: {
      domainParts,
      pathParts,
      queryParams,
    },
  }

  return parsed
}

/**
 * Extracts domain and subdomain from hostname
 */
function extractDomainComponents(hostname: string, isIP: boolean): { domain: string; subdomain: string } {
  if (isIP) {
    return {
      domain: hostname,
      subdomain: '',
    }
  }

  const parts = hostname.split('.')
  
  // Handle special cases like localhost
  if (parts.length === 1) {
    return {
      domain: hostname,
      subdomain: '',
    }
  }

  // For domains with known TLDs, extract the main domain
  const knownTLDs = [
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    'co.uk', 'com.au', 'co.jp', 'com.br', 'co.za',
    'ac.uk', 'gov.uk', 'org.uk', 'me.uk',
  ]

  let domain = hostname
  let subdomain = ''

  // Check for compound TLDs first
  const compoundTLDs = knownTLDs.filter(tld => tld.includes('.'))
  for (const tld of compoundTLDs.sort((a, b) => b.length - a.length)) {
    if (hostname.endsWith(`.${tld}`)) {
      const withoutTLD = hostname.slice(0, -(tld.length + 1))
      const remainingParts = withoutTLD.split('.')
      
      if (remainingParts.length >= 1) {
        const domainName = remainingParts[remainingParts.length - 1]
        domain = `${domainName}.${tld}`
        
        if (remainingParts.length > 1) {
          subdomain = remainingParts.slice(0, -1).join('.')
        }
      }
      return { domain, subdomain }
    }
  }

  // Handle regular TLDs
  if (parts.length >= 2) {
    // Assume last two parts are domain.tld
    domain = parts.slice(-2).join('.')
    
    if (parts.length > 2) {
      subdomain = parts.slice(0, -2).join('.')
    }
  }

  return { domain, subdomain }
}

/**
 * Validates IPv4 address format
 */
function isValidIPv4(hostname: string): boolean {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  if (!ipv4Pattern.test(hostname)) {
    return false
  }

  const parts = hostname.split('.').map(Number)
  return parts.every(part => part >= 0 && part <= 255)
}

/**
 * Validates IPv6 address format
 */
function isValidIPv6(hostname: string): boolean {
  // Remove brackets if present (URL constructor includes them for IPv6)
  const cleanHostname = hostname.replace(/^\[|\]$/g, '')
  
  // Simplified IPv6 validation
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
 * Gets the root domain from a parsed URL (domain without subdomain)
 */
export function getRootDomain(parsedUrl: ParsedURL): string {
  return parsedUrl.domain
}

/**
 * Gets the full domain with subdomain
 */
export function getFullDomain(parsedUrl: ParsedURL): string {
  if (parsedUrl.subdomain) {
    return `${parsedUrl.subdomain}.${parsedUrl.domain}`
  }
  return parsedUrl.domain
}

/**
 * Checks if the URL has a specific subdomain
 */
export function hasSubdomain(parsedUrl: ParsedURL, subdomain: string): boolean {
  if (!parsedUrl.subdomain) {
    return false
  }
  
  const subdomains = parsedUrl.subdomain.split('.')
  return subdomains.includes(subdomain)
}

/**
 * Gets all subdomains as an array
 */
export function getSubdomains(parsedUrl: ParsedURL): string[] {
  if (!parsedUrl.subdomain) {
    return []
  }
  
  return parsedUrl.subdomain.split('.')
}

/**
 * Checks if URL has query parameters
 */
export function hasQueryParams(parsedUrl: ParsedURL): boolean {
  return parsedUrl.components.queryParams.length > 0
}

/**
 * Gets a specific query parameter value
 */
export function getQueryParam(parsedUrl: ParsedURL, key: string): string | undefined {
  return parsedUrl.searchParams[key]
}

/**
 * Checks if URL has a specific query parameter
 */
export function hasQueryParam(parsedUrl: ParsedURL, key: string): boolean {
  return key in parsedUrl.searchParams
}

/**
 * Gets the file extension from the URL path
 */
export function getFileExtension(parsedUrl: ParsedURL): string | undefined {
  const pathParts = parsedUrl.components.pathParts
  if (pathParts.length === 0) {
    return undefined
  }

  const lastPart = pathParts[pathParts.length - 1]
  const dotIndex = lastPart.lastIndexOf('.')
  
  if (dotIndex === -1 || dotIndex === lastPart.length - 1) {
    return undefined
  }

  return lastPart.slice(dotIndex + 1).toLowerCase()
}

/**
 * Checks if URL points to a file (has extension)
 */
export function isFileURL(parsedUrl: ParsedURL): boolean {
  return getFileExtension(parsedUrl) !== undefined
}

/**
 * Gets URL depth (number of path segments)
 */
export function getURLDepth(parsedUrl: ParsedURL): number {
  return parsedUrl.components.pathParts.length
}