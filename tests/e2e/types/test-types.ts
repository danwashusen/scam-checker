/**
 * Test-specific types for E2E testing
 * Based on implementation plan specifications
 */

export interface TestAnalysisResult {
  url: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  riskStatus: 'safe' | 'caution' | 'danger'
  factors: RiskFactor[]
  timestamp: string
}

export interface RiskFactor {
  id: string
  type: 'positive' | 'negative'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  icon: string
}

export interface PerformanceMetrics {
  lcp: number  // Largest Contentful Paint
  fid: number  // First Input Delay
  cls: number  // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  fcp: number  // First Contentful Paint
}

export interface AccessibilityViolation {
  id: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  description: string
  nodes: NodeResult[]
}

export interface NodeResult {
  html: string
  target: string[]
  failureSummary?: string
}

export interface TestScenario {
  name: string
  setup: () => Promise<void>
  execute: () => Promise<void>
  assertions: () => Promise<void>
  teardown: () => Promise<void>
}

// Share and Export types from main app
export type ShareMethod = 'link' | 'email' | 'twitter' | 'facebook'
export type ExportFormat = 'pdf' | 'json' | 'csv'

// Mock data interfaces for testing
export interface MockAnalysisResponse {
  success: boolean
  data: {
    url: string
    riskScore: number
    riskLevel: string
    factors: Array<{
      type: string
      score: number
      description: string
    }>
    timestamp: string
    explanation: string
    domainAge?: {
      ageInDays: number
      registrationDate: string
      registrar: string
    }
    sslCertificate?: {
      error?: string
      certificateAuthority?: string
    }
    reputation?: {
      isClean: boolean
    }
  }
  error?: string
}

export interface MockErrorResponse {
  success: false
  error: string
  message: string
  status: number
}

// Test data builders
export interface TestUrlData {
  url: string
  expectedRisk: 'low' | 'medium' | 'high'
  description: string
  shouldPass: boolean
}

export interface TestUser {
  id: string
  name: string
  email: string
  preferences: {
    view: 'simple' | 'technical'
    notifications: boolean
  }
}

// Browser and device configurations
export interface TestDevice {
  name: string
  viewport: {
    width: number
    height: number
  }
  userAgent?: string
  deviceScaleFactor?: number
  isMobile?: boolean
  hasTouch?: boolean
}

// Performance test thresholds
export interface PerformanceThresholds {
  lcp: number     // < 2500ms
  fid: number     // < 100ms
  cls: number     // < 0.1
  ttfb: number    // < 600ms
  fcp: number     // < 1800ms
  bundleSize: number  // < 200KB
}

// Accessibility test configuration
export interface AccessibilityConfig {
  level: 'A' | 'AA' | 'AAA'
  tags: string[]
  exclude: string[]
  include: string[]
}

// Network conditions for testing
export interface NetworkConditions {
  offline: boolean
  downloadThroughput: number
  uploadThroughput: number
  latency: number
}

// Test fixtures data
export interface TestFixtureData {
  users: TestUser[]
  urls: TestUrlData[]
  mockResponses: MockAnalysisResponse[]
  errorScenarios: MockErrorResponse[]
  devices: TestDevice[]
  networkConditions: NetworkConditions[]
}

// Custom assertions
export interface CustomMatchers {
  toHaveValidUrl(): void
  toHaveRiskScore(score: number): void
  toHavePerformanceWithin(thresholds: PerformanceThresholds): void
  toBeAccessible(config?: AccessibilityConfig): void
  toHandleError(errorType: string): void
}