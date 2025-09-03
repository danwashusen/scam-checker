"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

export interface DomainHeaderProps {
  url: string
  className?: string
}

/**
 * Extract domain from URL with edge case handling
 * Handles IP addresses, internationalized domains, and subdomains
 */
function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url)
    let hostname = parsedUrl.hostname

    // Remove www prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }

    // Handle IP addresses - return as is
    if (isIPAddress(hostname)) {
      return hostname
    }

    // Handle internationalized domains (IDN)
    if (containsNonASCII(hostname)) {
      // Browser should handle this automatically, but we can add logging
      console.log('[DomainHeader] IDN domain detected:', hostname)
      return hostname
    }

    return hostname
  } catch (error) {
    // Fallback for malformed URLs
    console.warn('[DomainHeader] URL parsing failed, using fallback:', error)
    return extractBasicDomain(url)
  }
}

/**
 * Check if hostname is an IP address
 */
function isIPAddress(hostname: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 pattern (comprehensive check including compressed notation)
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::1|::|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/i
  
  return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname)
}

/**
 * Check if hostname contains non-ASCII characters (IDN)
 */
function containsNonASCII(hostname: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(hostname)
}

/**
 * Fallback domain extraction for malformed URLs
 */
function extractBasicDomain(url: string): string {
  try {
    // Remove protocol if present
    let cleanUrl = url.replace(/^https?:\/\//, '')
    // Remove path if present
    cleanUrl = cleanUrl.split('/')[0]
    // Remove port if present
    cleanUrl = cleanUrl.split(':')[0]
    // Remove www if present
    if (cleanUrl.startsWith('www.')) {
      cleanUrl = cleanUrl.substring(4)
    }
    return cleanUrl || url // Fallback to original URL if everything fails
  } catch {
    return url // Ultimate fallback
  }
}

export function DomainHeader({ url, className }: DomainHeaderProps) {
  const domain = useMemo(() => extractDomain(url), [url])

  return (
    <h2 
      className={cn(
        // Enhanced responsive typography for better prominence (Visual Improvement)
        "text-xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground",
        // Add some spacing and ensure proper line breaks for long domains
        "break-words leading-tight",
        // Enhanced prominence with subtle enhancement
        "mb-1",
        className
      )}
      data-testid="domain-header"
    >
      {domain}
    </h2>
  )
}