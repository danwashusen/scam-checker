/**
 * Unit tests for URLPatternDetector
 * Tests homograph detection, typosquatting, and other URL pattern analysis
 */

import { URLPatternDetector, analyzeURLPatterns } from '../../../../src/lib/analysis/url-pattern-detector'

describe('URLPatternDetector', () => {
  let detector: URLPatternDetector

  beforeEach(() => {
    detector = new URLPatternDetector()
  })

  describe('Homograph Detection', () => {
    it('should detect homograph attacks', () => {
      const result = detector.analyzeURL('https://pаypal.com', 'pаypal.com', '/')
      
      expect(result.isHomograph).toBe(true)
      expect(result.suspiciousScore).toBeGreaterThan(30)
      expect(result.detectedPatterns).toContain('homograph_attack')
    })

    it('should not flag legitimate domains', () => {
      const result = detector.analyzeURL('https://paypal.com', 'paypal.com', '/')
      
      expect(result.isHomograph).toBe(false)
    })
  })

  describe('Typosquatting Detection', () => {
    it('should detect character substitution typosquatting', () => {
      const result = detector.analyzeURL('https://payp4l.com', 'payp4l.com', '/')
      
      expect(result.isTyposquat).toBe(true)
      expect(result.brandImpersonation?.likelyTarget).toBe('paypal')
      expect(result.detectedPatterns).toContain('typosquatting')
    })

    it('should detect character insertion typosquatting', () => {
      const result = detector.analyzeURL('https://payypal.com', 'payypal.com', '/')
      
      expect(result.isTyposquat).toBe(true)
      expect(result.brandImpersonation?.likelyTarget).toBe('paypal')
    })

    it('should detect character deletion typosquatting', () => {
      const result = detector.analyzeURL('https://paypl.com', 'paypl.com', '/')
      
      expect(result.isTyposquat).toBe(true)
      expect(result.brandImpersonation?.likelyTarget).toBe('paypal')
    })

    it('should detect subdomain abuse', () => {
      const result = detector.analyzeURL('https://paypal.malicious.com', 'paypal.malicious.com', '/')
      
      expect(result.brandImpersonation?.likelyTarget).toBe('paypal')
      expect(result.brandImpersonation?.confidence).toBeGreaterThan(0.8)
    })

    it('should not flag legitimate variations', () => {
      const result = detector.analyzeURL('https://github.com', 'github.com', '/')
      
      expect(result.isTyposquat).toBe(false)
      expect(result.brandImpersonation).toBeUndefined()
    })
  })

  describe('Suspicious TLD Detection', () => {
    it('should detect suspicious TLDs', () => {
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq']
      
      suspiciousTLDs.forEach(tld => {
        const result = detector.analyzeURL(`https://test${tld}`, `test${tld}`, '/')
        
        expect(result.hasSuspiciousTLD).toBe(true)
        expect(result.detectedPatterns).toContain('suspicious_tld')
        expect(result.detectedPatterns).toContain(`suspicious_tld:${tld}`)
      })
    })

    it('should not flag legitimate TLDs', () => {
      const legitimateTLDs = ['.com', '.org', '.net', '.gov', '.edu']
      
      legitimateTLDs.forEach(tld => {
        const result = detector.analyzeURL(`https://test${tld}`, `test${tld}`, '/')
        
        expect(result.hasSuspiciousTLD).toBe(false)
      })
    })
  })

  describe('Phishing Pattern Detection', () => {
    it('should detect login page patterns', () => {
      const phishingPaths = [
        '/login.php',
        '/signin.html',
        '/verify-account.php',
        '/update-billing.html',
        '/urgent-security.php'
      ]
      
      phishingPaths.forEach(path => {
        const result = detector.analyzeURL(`https://test.com${path}`, 'test.com', path)
        
        expect(result.hasPhishingPatterns).toBe(true)
        expect(result.detectedPatterns).toContain('phishing_patterns')
      })
    })

    it('should detect suspicious parameters', () => {
      const url = 'https://test.com/redirect?redirect=https://malicious.com&token=abc123456789'
      const result = detector.analyzeURL(url, 'test.com', '/redirect')
      
      expect(result.hasPhishingPatterns).toBe(true)
    })

    it('should not flag legitimate paths', () => {
      const legitimatePaths = [
        '/about',
        '/contact',
        '/products',
        '/docs/api',
        '/blog/post-123'
      ]
      
      legitimatePaths.forEach(path => {
        const result = detector.analyzeURL(`https://github.com${path}`, 'github.com', path)
        
        expect(result.hasPhishingPatterns).toBe(false)
      })
    })
  })

  describe('Obfuscation Detection', () => {
    it('should detect excessive URL encoding', () => {
      const url = 'https://test.com/%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F'
      const result = detector.analyzeURL(url, 'test.com', '/%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F')
      
      expect(result.hasObfuscation).toBe(true)
      expect(result.detectedPatterns).toContain('url_obfuscation')
    })

    it('should detect IP address usage', () => {
      const url = 'https://192.168.1.1/login.php'
      const result = detector.analyzeURL(url, '192.168.1.1', '/login.php')
      
      expect(result.hasObfuscation).toBe(true)
    })

    it('should detect URL shorteners in suspicious contexts', () => {
      const url = 'https://bit.ly/suspicious-link'
      const result = detector.analyzeURL(url, 'bit.ly', '/suspicious-link')
      
      expect(result.hasObfuscation).toBe(true)
    })
  })

  describe('Brand Impersonation Analysis', () => {
    it('should detect high-confidence brand impersonation', () => {
      const result = detector.analyzeURL('https://secure-amazon.tk', 'secure-amazon.tk', '/')
      
      expect(result.brandImpersonation).toBeDefined()
      expect(result.brandImpersonation?.likelyTarget).toBe('amazon')
      expect(result.brandImpersonation?.confidence).toBeGreaterThan(0.6)
    })

    it('should calculate appropriate confidence levels', () => {
      const exactMatch = detector.analyzeURL('https://paypal.malicious.com', 'paypal.malicious.com', '/')
      const similarMatch = detector.analyzeURL('https://payp4l.com', 'payp4l.com', '/')
      
      expect(exactMatch.brandImpersonation?.confidence).toBeGreaterThan(0.8)
      expect(similarMatch.brandImpersonation?.confidence).toBeLessThan(0.9)
    })
  })

  describe('Scoring Algorithm', () => {
    it('should assign higher scores for multiple red flags', () => {
      const multipleFlags = detector.analyzeURL(
        'https://payp4l.tk/login.php?redirect=https://evil.com',
        'payp4l.tk',
        '/login.php'
      )
      
      const singleFlag = detector.analyzeURL('https://test.tk', 'test.tk', '/')
      
      expect(multipleFlags.suspiciousScore).toBeGreaterThan(singleFlag.suspiciousScore)
      expect(multipleFlags.suspiciousScore).toBeGreaterThan(70)
    })

    it('should cap scores at 100', () => {
      const extremeCase = detector.analyzeURL(
        'https://pаyp4l.tk/urgent-login.php?redirect=https://evil.com&token=steal-credentials',
        'pаyp4l.tk',
        '/urgent-login.php'
      )
      
      expect(extremeCase.suspiciousScore).toBeLessThanOrEqual(100)
    })

    it('should assign low scores for legitimate sites', () => {
      const legitimate = detector.analyzeURL('https://github.com/microsoft/vscode', 'github.com', '/microsoft/vscode')
      
      expect(legitimate.suspiciousScore).toBeLessThan(30)
      expect(legitimate.detectedPatterns).toHaveLength(0)
    })
  })

  describe('Pattern Collection', () => {
    it('should collect all detected patterns', () => {
      const result = detector.analyzeURL(
        'https://pаypal.tk/login.php',
        'pаypal.tk',
        '/login.php'
      )
      
      expect(result.detectedPatterns).toContain('homograph_attack')
      expect(result.detectedPatterns).toContain('suspicious_tld')
      expect(result.detectedPatterns).toContain('phishing_patterns')
      expect(result.detectedPatterns.some(p => p.startsWith('brand_impersonation:'))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', () => {
      const result = detector.analyzeURL('not-a-url', 'invalid-domain', '')
      
      expect(result).toBeDefined()
      expect(result.suspiciousScore).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty strings', () => {
      const result = detector.analyzeURL('', '', '')
      
      expect(result).toBeDefined()
      expect(result.detectedPatterns).toBeDefined()
    })

    it('should handle very long URLs', () => {
      const longPath = '/very-long-path' + 'a'.repeat(200)
      const result = detector.analyzeURL(`https://test.com${longPath}`, 'test.com', longPath)
      
      expect(result.hasObfuscation).toBe(true)
    })
  })

  describe('Convenience Function', () => {
    it('should work with the convenience function', () => {
      const result = analyzeURLPatterns('https://payp4l.com', 'payp4l.com', '/')
      
      expect(result.isTyposquat).toBe(true)
      expect(result.brandImpersonation?.likelyTarget).toBe('paypal')
    })
  })

  describe('Performance', () => {
    it('should complete analysis within reasonable time', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 10; i++) {
        detector.analyzeURL(`https://test${i}.com`, `test${i}.com`, '/path')
      }
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // Less than 1 second for 10 analyses
    })
  })
})