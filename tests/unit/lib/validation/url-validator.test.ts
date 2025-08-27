import { validateURL, isValidURL } from '../../../../src/lib/validation/url-validator'

describe('URL Validator', () => {
  describe('validateURL', () => {
    describe('valid URLs', () => {
      test('validates basic HTTPS URLs', () => {
        const result = validateURL('https://example.com')
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
        expect(result.normalizedUrl).toBe('https://example.com/')
      })

      test('validates basic HTTP URLs', () => {
        const result = validateURL('http://example.com')
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      test('validates URLs with paths', () => {
        const result = validateURL('https://example.com/path/to/resource')
        expect(result.isValid).toBe(true)
      })

      test('validates URLs with query parameters', () => {
        const result = validateURL('https://example.com?param=value&other=test')
        expect(result.isValid).toBe(true)
      })

      test('validates URLs with fragments', () => {
        const result = validateURL('https://example.com#section')
        expect(result.isValid).toBe(true)
      })

      test('validates URLs with ports', () => {
        const result = validateURL('https://example.com:8080')
        expect(result.isValid).toBe(true)
      })

      test('validates subdomains', () => {
        const result = validateURL('https://api.example.com')
        expect(result.isValid).toBe(true)
      })

      test('validates IPv4 addresses when allowed', () => {
        const result = validateURL('https://192.168.1.1', {
          allowPrivateIPs: true,
        })
        expect(result.isValid).toBe(true)
      })

      test('validates localhost when allowed', () => {
        const result = validateURL('https://localhost:3000', {
          allowLocalhost: true,
        })
        expect(result.isValid).toBe(true)
      })

      test('validates URLs without protocol by adding https', () => {
        const result = validateURL('example.com')
        expect(result.isValid).toBe(true)
        expect(result.normalizedUrl).toBe('https://example.com/')
      })
    })

    describe('invalid URLs', () => {
      test('rejects empty URLs', () => {
        const result = validateURL('')
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('invalid-format')
      })

      test('rejects malformed URLs', () => {
        const result = validateURL('not-a-url')
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('invalid-domain')
      })

      test('rejects URLs with unsupported protocols', () => {
        const result = validateURL('ftp://example.com')
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('unsupported-protocol')
      })

      test('rejects URLs that are too long', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(2100)
        const result = validateURL(longUrl)
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('too-long')
      })

      test('rejects private IP addresses by default', () => {
        const testCases = [
          '192.168.1.1',
          '10.0.0.1',
          '172.16.0.1',
          '127.0.0.1',
        ]

        testCases.forEach(ip => {
          const result = validateURL(`https://${ip}`)
          expect(result.isValid).toBe(false)
          expect(result.errorType).toBe('security-risk')
        })
      })

      test('rejects localhost by default', () => {
        const result = validateURL('https://localhost')
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('security-risk')
      })

      test('rejects malicious protocols', () => {
        const maliciousUrls = [
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:msgbox(1)',
        ]

        maliciousUrls.forEach(url => {
          const result = validateURL(url)
          expect(result.isValid).toBe(false)
          expect(result.errorType).toBe('security-risk')
        })
      })

      test('rejects URLs without valid domains', () => {
        const result = validateURL('https://.com')
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('invalid-domain')
      })

      test('rejects URLs with suspicious redirect patterns', () => {
        const result = validateURL('https://example.com//redirect//malicious.com')
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('security-risk')
      })
    })

    describe('internationalized domain names (IDN)', () => {
      test('validates basic IDN domains', () => {
        const result = validateURL('https://münchen.de')
        expect(result.isValid).toBe(true)
      })

      test('validates punycode domains', () => {
        const result = validateURL('https://xn--mnchen-3ya.de')
        expect(result.isValid).toBe(true)
      })
    })

    describe('edge cases', () => {
      test('handles URLs with unusual but valid characters', () => {
        const result = validateURL('https://test-site.co.uk')
        expect(result.isValid).toBe(true)
      })

      test('handles very short domains', () => {
        const result = validateURL('https://a.co')
        expect(result.isValid).toBe(true)
      })

      test('rejects domains that are too long', () => {
        const longDomain = 'a'.repeat(254)
        const result = validateURL(`https://${longDomain}.com`)
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('invalid-domain')
      })

      test('handles IPv6 addresses when allowed', () => {
        const result = validateURL('https://[::1]:8080', {
          allowPrivateIPs: true,
        })
        expect(result.isValid).toBe(true)
      })
    })

    describe('custom options', () => {
      test('respects custom protocol restrictions', () => {
        const result = validateURL('https://example.com', {
          allowedProtocols: ['http:'],
        })
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('unsupported-protocol')
      })

      test('respects custom length limits', () => {
        const result = validateURL('https://example.com/path', {
          maxLength: 20,
        })
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('too-long')
      })

      test('allows private IPs when configured', () => {
        const result = validateURL('https://192.168.1.1', {
          allowPrivateIPs: true,
        })
        expect(result.isValid).toBe(true)
      })

      test('allows localhost when configured', () => {
        const result = validateURL('https://localhost:3000', {
          allowLocalhost: true,
        })
        expect(result.isValid).toBe(true)
      })
    })

    describe('normalization', () => {
      test('normalizes hostname to lowercase', () => {
        const result = validateURL('https://EXAMPLE.COM')
        expect(result.normalizedUrl).toBe('https://example.com/')
      })

      test('removes default ports', () => {
        const httpsResult = validateURL('https://example.com:443')
        expect(httpsResult.normalizedUrl).toBe('https://example.com/')

        const httpResult = validateURL('http://example.com:80')
        expect(httpResult.normalizedUrl).toBe('http://example.com/')
      })

      test('preserves non-default ports', () => {
        const result = validateURL('https://example.com:8080')
        expect(result.normalizedUrl).toBe('https://example.com:8080/')
      })
    })
  })

  describe('isValidURL', () => {
    test('returns true for valid URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true)
    })

    test('returns false for invalid URLs', () => {
      expect(isValidURL('not-a-url')).toBe(false)
    })

    test('accepts validation options', () => {
      expect(isValidURL('https://localhost', { allowLocalhost: true })).toBe(true)
      expect(isValidURL('https://localhost', { allowLocalhost: false })).toBe(false)
    })
  })

  describe('security tests', () => {
    test('blocks SSRF attempts', () => {
      const ssrfUrls = [
        'http://127.0.0.1:8080/admin',
        'https://192.168.1.1/internal',
        'http://10.0.0.1/metadata',
        'https://169.254.169.254/latest/meta-data',
        'http://[::1]:22/ssh',
      ]

      ssrfUrls.forEach(url => {
        const result = validateURL(url)
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('security-risk')
      })
    })

    test('blocks XSS attempts in URLs', () => {
      const xssUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:Execute("MsgBox(1)")',
      ]

      xssUrls.forEach(url => {
        const result = validateURL(url)
        expect(result.isValid).toBe(false)
        expect(result.errorType).toBe('security-risk')
      })
    })

    test('handles null bytes and control characters', () => {
      const maliciousUrls = [
        'https://example.com\x00.evil.com',
        'https://example.com\r\n.evil.com',
        'https://example.com\t.evil.com',
      ]

      maliciousUrls.forEach(url => {
        const result = validateURL(url)
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('performance tests', () => {
    test('handles large batches efficiently', () => {
      const urls = Array.from({ length: 1000 }, (_, i) => `https://example${i}.com`)
      const startTime = Date.now()

      const results = urls.map(url => validateURL(url))
      const endTime = Date.now()

      expect(results.every(r => r.isValid)).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})