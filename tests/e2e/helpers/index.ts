/**
 * E2E Test Helpers Index
 * Exports all testing utilities for easy importing
 */

// Performance testing
export { PerformanceHelper, performanceHelpers, defaultThresholds } from './performance'

// Accessibility testing
export { AccessibilityHelper, accessibilityHelpers, defaultA11yConfig } from './accessibility'

// Test data generation
export { TestDataFactory, testData } from './test-data'

// Custom assertions
export { expect, assertionHelpers } from './assertions'

// Re-export types
export type {
  PerformanceMetrics,
  PerformanceThresholds,
  AccessibilityViolation,
  AccessibilityConfig,
  TestAnalysisResult,
  TestUrlData,
  TestUser,
  TestFixtureData
} from '../types/test-types'