import { z } from 'zod'
import { validateURL, isValidURL } from './url-validator'
import type { URLValidationOptions, SanitizationOptions } from '../../types/url'

// Base URL validation options schema
export const URLValidationOptionsSchema = z.object({
  allowedProtocols: z.array(z.string()).optional(),
  maxLength: z.number().min(1).max(10000).optional(),
  allowPrivateIPs: z.boolean().optional(),
  allowLocalhost: z.boolean().optional(),
}).optional()

// Sanitization options schema
export const SanitizationOptionsSchema = z.object({
  removeTrackingParams: z.boolean().optional(),
  upgradeProtocol: z.boolean().optional(),
  removeFragments: z.boolean().optional(),
  normalizeEncoding: z.boolean().optional(),
  normalizeCase: z.boolean().optional(),
  removeWww: z.boolean().optional(),
  customTrackingParams: z.array(z.string()).optional(),
}).optional()

// Custom URL validator using our validation logic
const urlValidator = z.string()
  .min(1, 'URL cannot be empty')
  .max(2083, 'URL exceeds maximum length')
  .refine(
    (url) => {
      try {
        const result = validateURL(url)
        return result.isValid
      } catch {
        return false
      }
    },
    {
      message: 'Please provide a valid URL',
    }
  )

// Enhanced URL validator with custom options
export const createURLValidator = (options?: URLValidationOptions) => {
  return z.string()
    .min(1, 'URL cannot be empty')
    .refine(
      (url) => {
        try {
          const result = validateURL(url, options)
          return result.isValid
        } catch {
          return false
        }
      },
      'Invalid URL format'
    )
    .transform((url) => {
      const result = validateURL(url, options)
      return result.normalizedUrl || url
    })
}

// Basic URL input validation schema
export const URLInputSchema = z.object({
  url: urlValidator,
})

// Analysis request schema
export const URLAnalysisRequestSchema = z.object({
  url: z.string().min(1, 'URL cannot be empty').max(2083, 'URL exceeds maximum length'),
  options: z.object({
    validation: URLValidationOptionsSchema,
    sanitization: SanitizationOptionsSchema,
    skipValidation: z.boolean().optional(),
    skipSanitization: z.boolean().optional(),
  }).optional(),
})

// Batch request schema
export const URLBatchRequestSchema = z.object({
  urls: z.array(z.string().min(1, 'URL cannot be empty')).min(1, 'At least one URL is required').max(100, 'Maximum 100 URLs per batch'),
  options: z.object({
    validation: URLValidationOptionsSchema,
    sanitization: SanitizationOptionsSchema,
    skipValidation: z.boolean().optional(),
    skipSanitization: z.boolean().optional(),
  }).optional(),
  batchId: z.string().optional(),
})

// URL validation response schema
export const URLValidationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    original: z.string(),
    validation: z.object({
      isValid: z.boolean(),
      error: z.string().optional(),
      errorType: z.enum(['invalid-format', 'unsupported-protocol', 'invalid-domain', 'security-risk', 'too-long']).optional(),
      normalizedUrl: z.string().optional(),
    }),
    parsed: z.object({
      original: z.string(),
      protocol: z.string(),
      hostname: z.string(),
      domain: z.string(),
      subdomain: z.string(),
      port: z.number().optional(),
      pathname: z.string(),
      search: z.string(),
      searchParams: z.record(z.string()),
      hash: z.string(),
      isIP: z.boolean(),
      isIPv4: z.boolean(),
      isIPv6: z.boolean(),
      components: z.object({
        domainParts: z.array(z.string()),
        pathParts: z.array(z.string()),
        queryParams: z.array(z.object({
          key: z.string(),
          value: z.string(),
        })),
      }),
    }).optional(),
    sanitization: z.object({
      original: z.string(),
      sanitized: z.string(),
      changes: z.array(z.object({
        type: z.enum(['tracking-removed', 'protocol-upgraded', 'fragment-removed', 'encoding-normalized', 'case-normalized']),
        description: z.string(),
        before: z.string().optional(),
        after: z.string().optional(),
      })),
      wasModified: z.boolean(),
    }).optional(),
    final: z.string(),
    metadata: z.object({
      timestamp: z.string(),
      processingTimeMs: z.number(),
      version: z.string(),
    }),
  }).optional(),
  error: z.object({
    message: z.string(),
    type: z.string(),
    details: z.any().optional(),
  }).optional(),
  timestamp: z.string(),
})

// Frontend form validation schemas
export const URLFormInputSchema = z.object({
  url: z.string()
    .min(1, 'Please enter a URL')
    .refine(
      (url) => {
        // Basic format check before expensive validation
        if (!url.includes('.') && !url.includes('localhost')) {
          return false
        }
        return true
      },
      {
        message: 'Please enter a valid URL (e.g., https://example.com)',
      }
    )
    .refine(
      (url) => isValidURL(url),
      {
        message: 'Please enter a valid URL format',
      }
    ),
})

// Advanced search/filter schemas
export const URLSearchFiltersSchema = z.object({
  protocol: z.enum(['http', 'https', 'both']).optional(),
  domain: z.string().optional(),
  hasSubdomain: z.boolean().optional(),
  hasQueryParams: z.boolean().optional(),
  hasTrackingParams: z.boolean().optional(),
  minLength: z.number().min(0).optional(),
  maxLength: z.number().max(2083).optional(),
  fileExtension: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'any']).optional(),
})

// Configuration schema
export const URLValidationConfigSchema = z.object({
  maxLength: z.number().min(1).max(10000).default(2083),
  allowedProtocols: z.array(z.string()).default(['http:', 'https:']),
  allowPrivateIPs: z.boolean().default(false),
  allowLocalhost: z.boolean().default(false),
  trackingParams: z.array(z.string()).default([]),
  customRules: z.array(z.object({
    name: z.string(),
    pattern: z.string(), // RegExp as string for serialization
    action: z.enum(['allow', 'block', 'warn']),
    message: z.string(),
  })).default([]),
})

// Type inference helpers
export type URLInputType = z.infer<typeof URLInputSchema>
export type URLAnalysisRequestType = z.infer<typeof URLAnalysisRequestSchema>
export type URLBatchRequestType = z.infer<typeof URLBatchRequestSchema>
export type URLValidationResponseType = z.infer<typeof URLValidationResponseSchema>
export type URLFormInputType = z.infer<typeof URLFormInputSchema>
export type URLSearchFiltersType = z.infer<typeof URLSearchFiltersSchema>
export type URLValidationConfigType = z.infer<typeof URLValidationConfigSchema>

// Validation helper functions
export function validateURLInput(data: unknown): { success: true; data: URLInputType } | { success: false; error: z.ZodError } {
  const result = URLInputSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateAnalysisRequest(data: unknown): { success: true; data: URLAnalysisRequestType } | { success: false; error: z.ZodError } {
  const result = URLAnalysisRequestSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateBatchRequest(data: unknown): { success: true; data: URLBatchRequestType } | { success: false; error: z.ZodError } {
  const result = URLBatchRequestSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateFormInput(data: unknown): { success: true; data: URLFormInputType } | { success: false; error: z.ZodError } {
  const result = URLFormInputSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

// Helper to format Zod errors for user-friendly display
export function formatValidationError(error: z.ZodError): string {
  const firstError = error.errors[0]
  if (firstError?.message) {
    return firstError.message
  }
  return 'Invalid input provided'
}

// Helper to get all validation error messages
export function getAllValidationErrors(error: z.ZodError): string[] {
  return error.errors.map(err => err.message)
}

// Helper to check if error is related to URL format
export function isURLFormatError(error: z.ZodError): boolean {
  return error.errors.some(err => 
    err.path.includes('url') || 
    err.message.toLowerCase().includes('url') ||
    err.message.toLowerCase().includes('format')
  )
}