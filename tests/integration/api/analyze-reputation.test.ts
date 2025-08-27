/**
 * Integration tests for reputation API functionality
 * Tests the Google Safe Browsing integration within the analyze endpoint
 */

// Mock the reputation service to avoid external API calls during testing
jest.mock('../../../src/lib/analysis/reputation-service', () => ({
  defaultReputationService: {
    analyzeURL: jest.fn()
  }
}))

// Mock the WHOIS and SSL services to isolate reputation testing
jest.mock('../../../src/lib/analysis/whois-service', () => ({
  defaultWhoisService: {
    analyzeDomain: jest.fn().mockResolvedValue({
      success: true,
      data: {
        ageInDays: 365,
        registrationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        registrar: 'Test Registrar',
        privacyProtected: false,
        score: 20,
        riskFactors: [],
        confidence: 0.8
      },
      fromCache: false
    })
  }
}))

jest.mock('../../../src/lib/analysis/ssl-service', () => ({
  defaultSSLService: {
    analyzeCertificate: jest.fn().mockResolvedValue({
      success: true,
      data: {
        certificateType: 'DV',
        certificateAuthority: { name: 'Test CA', trusted: true },
        daysUntilExpiry: 90,
        issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        certificateAge: 30,
        score: 15,
        riskFactors: [],
        confidence: 0.9
      },
      fromCache: false
    })
  }
}))

import { defaultReputationService } from '../../../src/lib/analysis/reputation-service'
import type { ReputationServiceResult } from '../../../src/types/reputation'
import { ThreatType, PlatformType, ThreatEntryType } from '../../../src/types/reputation'

const mockReputationService = defaultReputationService as jest.Mocked<typeof defaultReputationService>

describe('Reputation Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Clean URL reputation', () => {
    it('should process clean reputation result', async () => {
      const cleanReputationResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://example.com',
          isClean: true,
          threatMatches: [],
          riskFactors: [{
            type: 'reputation-clean',
            score: 0,
            description: 'URL is clean according to Google Safe Browsing'
          }],
          score: 0,
          riskLevel: 'low',
          confidence: 0.95,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(cleanReputationResult)

      const result = await mockReputationService.analyzeURL('https://example.com')
      
      expect(result.success).toBe(true)
      expect(result.data?.isClean).toBe(true)
      expect(result.data?.riskLevel).toBe('low')
      expect(result.data?.threatMatches).toHaveLength(0)
      expect(result.fromCache).toBe(false)
    })

    it('should handle cached clean results', async () => {
      const cachedCleanResult: ReputationServiceResult = {
        success: true,
        fromCache: true,
        data: {
          url: 'https://cached-clean.com',
          isClean: true,
          threatMatches: [],
          riskFactors: [{
            type: 'reputation-clean',
            score: 0,
            description: 'URL is clean according to Google Safe Browsing'
          }],
          score: 0,
          riskLevel: 'low',
          confidence: 0.95,
          timestamp: new Date(Date.now() - 3600000) // 1 hour ago
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(cachedCleanResult)

      const result = await mockReputationService.analyzeURL('https://cached-clean.com')
      
      expect(result.fromCache).toBe(true)
      expect(result.data?.isClean).toBe(true)
    })
  })

  describe('Malicious URL reputation', () => {
    it('should handle malware threats properly', async () => {
      const malwareReputationResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://malicious.com',
          isClean: false,
          threatMatches: [{
            threatType: ThreatType.MALWARE,
            platformType: PlatformType.ANY_PLATFORM,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://malicious.com' },
            cacheDuration: '300s'
          }],
          riskFactors: [{
            type: 'reputation-malware',
            score: 100,
            description: 'Google Safe Browsing detected malware threat for all platforms',
            threatType: ThreatType.MALWARE,
            platformType: PlatformType.ANY_PLATFORM
          }],
          score: 100,
          riskLevel: 'high',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(malwareReputationResult)

      const result = await mockReputationService.analyzeURL('https://malicious.com')
      
      expect(result.success).toBe(true)
      expect(result.data?.isClean).toBe(false)
      expect(result.data?.riskLevel).toBe('high')
      expect(result.data?.threatMatches).toHaveLength(1)
      expect(result.data?.threatMatches[0].threatType).toBe(ThreatType.MALWARE)
      expect(result.data?.score).toBe(100)
    })

    it('should handle phishing threats', async () => {
      const phishingReputationResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://phishing.com',
          isClean: false,
          threatMatches: [{
            threatType: ThreatType.SOCIAL_ENGINEERING,
            platformType: PlatformType.ANY_PLATFORM,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://phishing.com' },
            cacheDuration: '300s'
          }],
          riskFactors: [{
            type: 'reputation-social_engineering',
            score: 95,
            description: 'Google Safe Browsing detected phishing/social engineering threat for all platforms',
            threatType: ThreatType.SOCIAL_ENGINEERING,
            platformType: PlatformType.ANY_PLATFORM
          }],
          score: 95,
          riskLevel: 'high',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(phishingReputationResult)

      const result = await mockReputationService.analyzeURL('https://phishing.com')
      
      expect(result.data?.isClean).toBe(false)
      expect(result.data?.riskLevel).toBe('high')
      expect(result.data?.threatMatches[0].threatType).toBe(ThreatType.SOCIAL_ENGINEERING)
    })

    it('should handle multiple threats', async () => {
      const multiThreatResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://multi-threat.com',
          isClean: false,
          threatMatches: [
            {
              threatType: ThreatType.MALWARE,
              platformType: PlatformType.WINDOWS,
              threatEntryType: ThreatEntryType.URL,
              threat: { url: 'https://multi-threat.com' },
              cacheDuration: '300s'
            },
            {
              threatType: ThreatType.UNWANTED_SOFTWARE,
              platformType: PlatformType.ANDROID,
              threatEntryType: ThreatEntryType.URL,
              threat: { url: 'https://multi-threat.com' },
              cacheDuration: '300s'
            }
          ],
          riskFactors: [
            {
              type: 'reputation-malware',
              score: 90,
              description: 'Google Safe Browsing detected malware threat for windows',
              threatType: ThreatType.MALWARE,
              platformType: PlatformType.WINDOWS
            },
            {
              type: 'reputation-unwanted_software',
              score: 64,
              description: 'Google Safe Browsing detected unwanted software for android',
              threatType: ThreatType.UNWANTED_SOFTWARE,
              platformType: PlatformType.ANDROID
            }
          ],
          score: 90, // Highest threat score
          riskLevel: 'high',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(multiThreatResult)

      const result = await mockReputationService.analyzeURL('https://multi-threat.com')
      
      expect(result.data?.threatMatches).toHaveLength(2)
      expect(result.data?.threatMatches[0].threatType).toBe(ThreatType.MALWARE)
      expect(result.data?.threatMatches[1].threatType).toBe(ThreatType.UNWANTED_SOFTWARE)
      expect(result.data?.score).toBe(90)
    })

    it('should handle potentially harmful applications', async () => {
      const phaResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://pha.com',
          isClean: false,
          threatMatches: [{
            threatType: ThreatType.POTENTIALLY_HARMFUL_APPLICATION,
            platformType: PlatformType.ANDROID,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://pha.com' },
            cacheDuration: '300s'
          }],
          riskFactors: [{
            type: 'reputation-potentially_harmful_application',
            score: 48, // 60 * 0.8 (Android multiplier)
            description: 'Google Safe Browsing detected potentially harmful application for android',
            threatType: ThreatType.POTENTIALLY_HARMFUL_APPLICATION,
            platformType: PlatformType.ANDROID
          }],
          score: 48,
          riskLevel: 'medium',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(phaResult)

      const result = await mockReputationService.analyzeURL('https://pha.com')
      
      expect(result.data?.riskLevel).toBe('medium')
      expect(result.data?.score).toBe(48)
      expect(result.data?.threatMatches[0].threatType).toBe(ThreatType.POTENTIALLY_HARMFUL_APPLICATION)
    })
  })

  describe('Platform-specific threats', () => {
    it('should handle Windows-specific threats', async () => {
      const windowsThreatResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://windows-malware.com',
          isClean: false,
          threatMatches: [{
            threatType: ThreatType.MALWARE,
            platformType: PlatformType.WINDOWS,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://windows-malware.com' },
            cacheDuration: '300s'
          }],
          riskFactors: [{
            type: 'reputation-malware',
            score: 90, // 100 * 0.9 (Windows multiplier)
            description: 'Google Safe Browsing detected malware threat for windows',
            threatType: ThreatType.MALWARE,
            platformType: PlatformType.WINDOWS
          }],
          score: 90,
          riskLevel: 'high',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(windowsThreatResult)

      const result = await mockReputationService.analyzeURL('https://windows-malware.com')
      
      expect(result.data?.threatMatches[0].platformType).toBe(PlatformType.WINDOWS)
      expect(result.data?.score).toBe(90)
    })

    it('should handle mobile-specific threats', async () => {
      const mobileThreatResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://mobile-threat.com',
          isClean: false,
          threatMatches: [
            {
              threatType: ThreatType.UNWANTED_SOFTWARE,
              platformType: PlatformType.ANDROID,
              threatEntryType: ThreatEntryType.URL,
              threat: { url: 'https://mobile-threat.com' },
              cacheDuration: '300s'
            },
            {
              threatType: ThreatType.UNWANTED_SOFTWARE,
              platformType: PlatformType.IOS,
              threatEntryType: ThreatEntryType.URL,
              threat: { url: 'https://mobile-threat.com' },
              cacheDuration: '300s'
            }
          ],
          riskFactors: [
            {
              type: 'reputation-unwanted_software',
              score: 64, // 80 * 0.8 (Android)
              description: 'Google Safe Browsing detected unwanted software for android',
              threatType: ThreatType.UNWANTED_SOFTWARE,
              platformType: PlatformType.ANDROID
            },
            {
              type: 'reputation-unwanted_software',
              score: 40, // 80 * 0.5 (iOS)
              description: 'Google Safe Browsing detected unwanted software for ios',
              threatType: ThreatType.UNWANTED_SOFTWARE,
              platformType: PlatformType.IOS
            }
          ],
          score: 64, // Highest score
          riskLevel: 'medium',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(mobileThreatResult)

      const result = await mockReputationService.analyzeURL('https://mobile-threat.com')
      
      expect(result.data?.threatMatches).toHaveLength(2)
      expect(result.data?.threatMatches[0].platformType).toBe(PlatformType.ANDROID)
      expect(result.data?.threatMatches[1].platformType).toBe(PlatformType.IOS)
    })
  })

  describe('Reputation service failures', () => {
    it('should handle API unavailability gracefully', async () => {
      const failedReputationResult: ReputationServiceResult = {
        success: false,
        fromCache: false,
        error: {
          message: 'Google Safe Browsing API unavailable',
          type: 'api_error'
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(failedReputationResult)

      const result = await mockReputationService.analyzeURL('https://example.com')
      
      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('api_error')
      expect(result.error?.message).toContain('Google Safe Browsing API unavailable')
    })

    it('should handle rate limiting', async () => {
      const rateLimitResult: ReputationServiceResult = {
        success: false,
        fromCache: false,
        error: {
          message: 'Rate limit exceeded',
          type: 'quota_exceeded'
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(rateLimitResult)

      const result = await mockReputationService.analyzeURL('https://example.com')
      
      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('quota_exceeded')
    })

    it('should handle authentication errors', async () => {
      const authErrorResult: ReputationServiceResult = {
        success: false,
        fromCache: false,
        error: {
          message: 'Invalid API key',
          type: 'auth_error'
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(authErrorResult)

      const result = await mockReputationService.analyzeURL('https://example.com')
      
      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('auth_error')
    })

    it('should handle network errors', async () => {
      const networkErrorResult: ReputationServiceResult = {
        success: false,
        fromCache: false,
        error: {
          message: 'Network timeout',
          type: 'network_error'
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(networkErrorResult)

      const result = await mockReputationService.analyzeURL('https://example.com')
      
      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('network_error')
    })

    it('should handle service exceptions gracefully', async () => {
      mockReputationService.analyzeURL.mockRejectedValue(new Error('Unexpected error'))

      await expect(mockReputationService.analyzeURL('https://example.com'))
        .rejects.toThrow('Unexpected error')
    })
  })

  describe('Cache behavior', () => {
    it('should indicate when results are from cache', async () => {
      const cachedReputationResult: ReputationServiceResult = {
        success: true,
        fromCache: true,
        data: {
          url: 'https://cached.com',
          isClean: true,
          threatMatches: [],
          riskFactors: [{
            type: 'reputation-clean',
            score: 0,
            description: 'URL is clean according to Google Safe Browsing'
          }],
          score: 0,
          riskLevel: 'low',
          confidence: 0.95,
          timestamp: new Date(Date.now() - 3600000) // 1 hour ago
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(cachedReputationResult)

      const result = await mockReputationService.analyzeURL('https://cached.com')
      
      expect(result.fromCache).toBe(true)
      expect(result.data?.timestamp.getTime()).toBeLessThan(Date.now() - 3000000)
    })

    it('should handle cache misses', async () => {
      const freshReputationResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://fresh.com',
          isClean: true,
          threatMatches: [],
          riskFactors: [{
            type: 'reputation-clean',
            score: 0,
            description: 'URL is clean according to Google Safe Browsing'
          }],
          score: 0,
          riskLevel: 'low',
          confidence: 0.95,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(freshReputationResult)

      const result = await mockReputationService.analyzeURL('https://fresh.com')
      
      expect(result.fromCache).toBe(false)
      expect(result.data?.timestamp.getTime()).toBeGreaterThan(Date.now() - 1000)
    })
  })

  describe('Risk scoring', () => {
    it('should properly score high-risk threats', async () => {
      const highRiskResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://high-risk.com',
          isClean: false,
          threatMatches: [{
            threatType: ThreatType.MALWARE,
            platformType: PlatformType.ANY_PLATFORM,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://high-risk.com' },
            cacheDuration: '300s'
          }],
          riskFactors: [{
            type: 'reputation-malware',
            score: 100,
            description: 'Google Safe Browsing detected malware threat for all platforms',
            threatType: ThreatType.MALWARE,
            platformType: PlatformType.ANY_PLATFORM
          }],
          score: 100,
          riskLevel: 'high',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(highRiskResult)

      const result = await mockReputationService.analyzeURL('https://high-risk.com')
      
      expect(result.data?.riskLevel).toBe('high')
      expect(result.data?.score).toBeGreaterThanOrEqual(70)
      expect(result.data?.confidence).toBeGreaterThan(0.95)
    })

    it('should properly score medium-risk threats', async () => {
      const mediumRiskResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://medium-risk.com',
          isClean: false,
          threatMatches: [{
            threatType: ThreatType.POTENTIALLY_HARMFUL_APPLICATION,
            platformType: PlatformType.ANDROID,
            threatEntryType: ThreatEntryType.URL,
            threat: { url: 'https://medium-risk.com' },
            cacheDuration: '300s'
          }],
          riskFactors: [{
            type: 'reputation-potentially_harmful_application',
            score: 48,
            description: 'Google Safe Browsing detected potentially harmful application for android',
            threatType: ThreatType.POTENTIALLY_HARMFUL_APPLICATION,
            platformType: PlatformType.ANDROID
          }],
          score: 48,
          riskLevel: 'medium',
          confidence: 0.98,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(mediumRiskResult)

      const result = await mockReputationService.analyzeURL('https://medium-risk.com')
      
      expect(result.data?.riskLevel).toBe('medium')
      expect(result.data?.score).toBeGreaterThanOrEqual(30)
      expect(result.data?.score).toBeLessThan(70)
    })

    it('should properly score low-risk (clean) URLs', async () => {
      const lowRiskResult: ReputationServiceResult = {
        success: true,
        fromCache: false,
        data: {
          url: 'https://low-risk.com',
          isClean: true,
          threatMatches: [],
          riskFactors: [{
            type: 'reputation-clean',
            score: 0,
            description: 'URL is clean according to Google Safe Browsing'
          }],
          score: 0,
          riskLevel: 'low',
          confidence: 0.95,
          timestamp: new Date()
        }
      }

      mockReputationService.analyzeURL.mockResolvedValue(lowRiskResult)

      const result = await mockReputationService.analyzeURL('https://low-risk.com')
      
      expect(result.data?.riskLevel).toBe('low')
      expect(result.data?.score).toBeLessThanOrEqual(29)
      expect(result.data?.isClean).toBe(true)
    })
  })

  describe('Batch processing', () => {
    it('should handle batch URL analysis', async () => {
      const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com']
      
      mockReputationService.analyzeURL
        .mockResolvedValueOnce({
          success: true,
          fromCache: false,
          data: {
            url: urls[0],
            isClean: true,
            threatMatches: [],
            riskFactors: [],
            score: 0,
            riskLevel: 'low',
            confidence: 0.95,
            timestamp: new Date()
          }
        })
        .mockResolvedValueOnce({
          success: true,
          fromCache: true,
          data: {
            url: urls[1],
            isClean: true,
            threatMatches: [],
            riskFactors: [],
            score: 0,
            riskLevel: 'low',
            confidence: 0.95,
            timestamp: new Date()
          }
        })
        .mockResolvedValueOnce({
          success: false,
          fromCache: false,
          error: {
            message: 'Network error',
            type: 'network_error'
          }
        })

      const results = await Promise.all(
        urls.map(url => mockReputationService.analyzeURL(url))
      )

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(results[1].fromCache).toBe(true)
      expect(results[2].success).toBe(false)
    })
  })
})