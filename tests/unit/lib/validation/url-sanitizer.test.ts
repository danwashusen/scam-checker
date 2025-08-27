import {
  sanitizeURL,
  removeTrackingParams,
  normalizeURLForAnalysis,
  getDisplayURL,
  sanitizeForLogging,
  hasTrackingParams,
  getTrackingParams,
  getCanonicalURL,
} from '../../../../src/lib/validation/url-sanitizer'

describe('URL Sanitizer', () => {
  describe('sanitizeURL', () => {
    test('removes tracking parameters by default', () => {
      const result = sanitizeURL('https://example.com?utm_source=google&utm_medium=cpc&normal=param')
      
      expect(result.sanitized).toBe('https://example.com/?normal=param')
      expect(result.wasModified).toBe(true)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].type).toBe('tracking-removed')
      expect(result.changes[0].description).toContain('2 tracking parameter(s)')
    })

    test('upgrades HTTP to HTTPS by default', () => {
      const result = sanitizeURL('http://example.com')
      
      expect(result.sanitized).toBe('https://example.com/')
      expect(result.wasModified).toBe(true)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].type).toBe('protocol-upgraded')
    })

    test('normalizes hostname case by default', () => {
      const result = sanitizeURL('https://EXAMPLE.COM/PATH')
      
      // URL constructor automatically normalizes hostname
      expect(result.sanitized).toBe('https://example.com/PATH')
      expect(result.wasModified).toBe(false) // URL constructor handles this
      expect(result.changes).toHaveLength(0)
    })

    test('performs multiple sanitizations', () => {
      const result = sanitizeURL('HTTP://EXAMPLE.COM/?utm_source=google&param=value#section')
      
      expect(result.sanitized).toBe('https://example.com/?param=value#section')
      expect(result.wasModified).toBe(true)
      expect(result.changes).toHaveLength(2) // protocol + tracking (case is handled by URL constructor)
    })

    test('handles URLs without protocol', () => {
      const result = sanitizeURL('example.com?utm_source=google')
      
      expect(result.sanitized).toBe('https://example.com/')
      expect(result.wasModified).toBe(true)
    })

    test('respects custom options', () => {
      const result = sanitizeURL('http://example.com?utm_source=google', {
        upgradeProtocol: false,
        removeTrackingParams: false,
        normalizeCase: false,
      })
      
      expect(result.sanitized).toBe('http://example.com/?utm_source=google')
      expect(result.wasModified).toBe(false)
    })

    test('removes www when configured', () => {
      const result = sanitizeURL('https://www.example.com', {
        removeWww: true,
      })
      
      expect(result.sanitized).toBe('https://example.com/')
      expect(result.wasModified).toBe(true)
    })

    test('removes fragments when configured', () => {
      const result = sanitizeURL('https://example.com#section', {
        removeFragments: true,
      })
      
      expect(result.sanitized).toBe('https://example.com/')
      expect(result.wasModified).toBe(true)
    })

    test('handles custom tracking parameters', () => {
      const result = sanitizeURL('https://example.com?custom_track=value&normal=param', {
        customTrackingParams: ['custom_track'],
      })
      
      expect(result.sanitized).toBe('https://example.com/?normal=param')
      expect(result.wasModified).toBe(true)
    })

    test('normalizes encoding when configured', () => {
      const result = sanitizeURL('https://example.com/path%20with%20spaces', {
        normalizeEncoding: true,
      })
      
      expect(result.sanitized).toContain('https://example.com/path%20with%20spaces')
      // Note: URL constructor already handles encoding normalization
    })

    test('returns original for invalid URLs', () => {
      const invalid = 'not-a-url'
      const result = sanitizeURL(invalid)
      
      expect(result.original).toBe(invalid)
      expect(result.sanitized).toBe('https://not-a-url/') // Gets prefixed with https://
      expect(result.wasModified).toBe(false)
      expect(result.changes).toHaveLength(0)
    })
  })

  describe('removeTrackingParams', () => {
    test('removes only tracking parameters', () => {
      const result = removeTrackingParams('https://example.com?utm_source=google&param=value&fbclid=123')
      expect(result).toBe('https://example.com/?param=value')
    })

    test('handles custom tracking parameters', () => {
      const result = removeTrackingParams('https://example.com?custom=track&param=value', ['custom'])
      expect(result).toBe('https://example.com/?param=value')
    })

    test('returns original if no tracking params', () => {
      const url = 'https://example.com?param=value'
      const result = removeTrackingParams(url)
      expect(result).toBe('https://example.com/?param=value') // URL constructor normalizes
    })
  })

  describe('normalizeURLForAnalysis', () => {
    test('prepares URL for analysis', () => {
      const result = normalizeURLForAnalysis('HTTP://EXAMPLE.COM/?utm_source=google&param=value#section')
      
      // Should remove tracking and fragments, URL constructor normalizes case and protocol
      expect(result).toBe('http://example.com/?param=value')
    })
  })

  describe('getDisplayURL', () => {
    test('creates clean display URL', () => {
      const result = getDisplayURL('https://example.com:443/path?param=value')
      
      expect(result).toBe('https://example.com/path?param=value')
    })

    test('removes default ports', () => {
      expect(getDisplayURL('https://example.com:443')).toBe('https://example.com/')
      expect(getDisplayURL('http://example.com:80')).toBe('http://example.com/')
    })

    test('preserves non-default ports', () => {
      const result = getDisplayURL('https://example.com:8080')
      expect(result).toBe('https://example.com:8080/')
    })
  })

  describe('sanitizeForLogging', () => {
    test('redacts sensitive parameters', () => {
      const result = sanitizeForLogging('https://example.com?password=secret&param=value&token=abc123')
      
      expect(result).toContain('password=%5BREDACTED%5D') // URL encoded [REDACTED]
      expect(result).toContain('token=%5BREDACTED%5D')
      expect(result).toContain('param=value')
    })

    test('handles invalid URLs', () => {
      const result = sanitizeForLogging('not-a-url')
      expect(result).toBe('[INVALID_URL]')
    })

    test('redacts all sensitive parameter types', () => {
      const sensitiveParams = [
        'password=secret',
        'passwd=secret',
        'pwd=secret',
        'token=secret',
        'key=secret',
        'secret=secret',
        'api_key=secret',
        'apikey=secret',
        'auth=secret',
        'authorization=secret',
        'session=secret',
        'sid=secret',
        'sessionid=secret',
        'csrf=secret',
        'email=test@example.com',
        'user=john',
        'username=john',
      ]

      const url = `https://example.com?${sensitiveParams.join('&')}&safe=value`
      const result = sanitizeForLogging(url)

      sensitiveParams.forEach(param => {
        const [key] = param.split('=')
        expect(result).toContain(`${key}=%5BREDACTED%5D`) // URL encoded [REDACTED]
      })
      expect(result).toContain('safe=value')
    })
  })

  describe('hasTrackingParams', () => {
    test('detects common tracking parameters', () => {
      expect(hasTrackingParams('https://example.com?utm_source=google')).toBe(true)
      expect(hasTrackingParams('https://example.com?fbclid=123')).toBe(true)
      expect(hasTrackingParams('https://example.com?gclid=456')).toBe(true)
    })

    test('returns false when no tracking params', () => {
      expect(hasTrackingParams('https://example.com?param=value')).toBe(false)
    })

    test('detects custom tracking parameters', () => {
      expect(hasTrackingParams('https://example.com?custom=track', ['custom'])).toBe(true)
    })
  })

  describe('getTrackingParams', () => {
    test('extracts tracking parameters', () => {
      const result = getTrackingParams('https://example.com?utm_source=google&utm_medium=cpc&param=value&fbclid=123')
      
      expect(result).toEqual({
        utm_source: 'google',
        utm_medium: 'cpc',
        fbclid: '123',
      })
    })

    test('returns empty object when no tracking params', () => {
      const result = getTrackingParams('https://example.com?param=value')
      expect(result).toEqual({})
    })

    test('includes custom tracking parameters', () => {
      const result = getTrackingParams('https://example.com?custom=track&utm_source=google', ['custom'])
      
      expect(result).toEqual({
        custom: 'track',
        utm_source: 'google',
      })
    })
  })

  describe('getCanonicalURL', () => {
    test('creates canonical URL for deduplication', () => {
      const result = getCanonicalURL('HTTP://WWW.EXAMPLE.COM/?utm_source=google&param=value#section')
      
      expect(result).toBe('https://example.com/?param=value')
    })

    test('handles complex URLs consistently', () => {
      const urls = [
        'https://www.example.com/path?utm_source=a&param=1#top',
        'HTTP://WWW.EXAMPLE.COM/path?param=1&utm_source=b#bottom',
        'https://example.com/path?param=1&tracking=c',
      ]

      const canonical = urls.map(getCanonicalURL)
      
      // All should produce the same canonical form (minus the tracking params)
      expect(canonical[0]).toBe('https://example.com/path?param=1')
      expect(canonical[1]).toBe('https://example.com/path?param=1')
      expect(canonical[2]).toBe('https://example.com/path?param=1')
    })
  })

  describe('tracking parameter coverage', () => {
    test('removes Google Analytics parameters', () => {
      const googleParams = [
        'utm_source=google',
        'utm_medium=cpc',
        'utm_campaign=test',
        'utm_term=keyword',
        'utm_content=ad',
        'gclid=123',
        'dclid=456',
        'gbraid=789',
        'wbraid=abc',
      ]

      const url = `https://example.com?${googleParams.join('&')}&keep=this`
      const result = sanitizeURL(url)

      expect(result.sanitized).toBe('https://example.com/?keep=this')
      expect(result.wasModified).toBe(true)
    })

    test('removes Facebook parameters', () => {
      const facebookParams = [
        'fbclid=123',
        'fb_action_ids=456',
        'fb_action_types=789',
        'fb_ref=abc',
        'fb_source=def',
      ]

      const url = `https://example.com?${facebookParams.join('&')}&keep=this`
      const result = sanitizeURL(url)

      expect(result.sanitized).toBe('https://example.com/?keep=this')
    })

    test('removes other platform parameters', () => {
      const otherParams = [
        'twclid=twitter',
        'msclkid=microsoft',
        'mc_cid=mailchimp',
        '_hsenc=hubspot',
        'igshid=instagram',
      ]

      const url = `https://example.com?${otherParams.join('&')}&keep=this`
      const result = sanitizeURL(url)

      expect(result.sanitized).toBe('https://example.com/?keep=this')
    })
  })

  describe('edge cases', () => {
    test('handles empty URL', () => {
      const result = sanitizeURL('')
      expect(result.original).toBe('')
      expect(result.sanitized).toBe('')
      expect(result.wasModified).toBe(false)
    })

    test('handles whitespace-only URL', () => {
      const result = sanitizeURL('   ')
      expect(result.original).toBe('')  // Gets trimmed
      expect(result.sanitized).toBe('')
      expect(result.wasModified).toBe(false)
    })

    test('handles URLs with only tracking parameters', () => {
      const result = sanitizeURL('https://example.com?utm_source=google&utm_medium=cpc')
      expect(result.sanitized).toBe('https://example.com/')
    })

    test('preserves complex query structures', () => {
      const result = sanitizeURL('https://example.com?array[0]=value1&array[1]=value2&utm_source=google')
      expect(result.sanitized).toBe('https://example.com/?array%5B0%5D=value1&array%5B1%5D=value2')
    })

    test('handles international domains', () => {
      const result = sanitizeURL('https://münchen.de?utm_source=google')
      expect(result.sanitized).toBe('https://xn--mnchen-3ya.de/') // URL constructor converts to punycode
    })

    test('handles very long URLs', () => {
      const longParam = 'a'.repeat(1000)
      const url = `https://example.com?data=${longParam}&utm_source=google`
      const result = sanitizeURL(url)
      
      expect(result.sanitized).toContain(`data=${longParam}`)
      expect(result.sanitized).not.toContain('utm_source')
    })
  })

  describe('performance tests', () => {
    test('handles batch sanitization efficiently', () => {
      const urls = Array.from({ length: 100 }, (_, i) => 
        `https://example${i}.com?utm_source=google&utm_medium=cpc&param=${i}`
      )
      
      const startTime = Date.now()
      const results = urls.map(url => sanitizeURL(url))
      const endTime = Date.now()

      expect(results.every(r => r.wasModified)).toBe(true)
      expect(results.every(r => !r.sanitized.includes('utm_'))).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast
    })
  })
})