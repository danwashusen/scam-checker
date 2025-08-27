import {
  parseURL,
  getRootDomain,
  getFullDomain,
  hasSubdomain,
  getSubdomains,
  hasQueryParams,
  getQueryParam,
  hasQueryParam,
  getFileExtension,
  isFileURL,
  getURLDepth,
} from '../../../../src/lib/validation/url-parser'

describe('URL Parser', () => {
  describe('parseURL', () => {
    test('parses basic HTTPS URL', () => {
      const result = parseURL('https://example.com')
      
      expect(result.original).toBe('https://example.com')
      expect(result.protocol).toBe('https:')
      expect(result.hostname).toBe('example.com')
      expect(result.domain).toBe('example.com')
      expect(result.subdomain).toBe('')
      expect(result.port).toBeUndefined()
      expect(result.pathname).toBe('/')
      expect(result.search).toBe('')
      expect(result.hash).toBe('')
      expect(result.isIP).toBe(false)
      expect(result.isIPv4).toBe(false)
      expect(result.isIPv6).toBe(false)
    })

    test('parses URL with subdomain', () => {
      const result = parseURL('https://api.example.com')
      
      expect(result.hostname).toBe('api.example.com')
      expect(result.domain).toBe('example.com')
      expect(result.subdomain).toBe('api')
      expect(result.components.domainParts).toEqual(['example', 'com'])
    })

    test('parses URL with multiple subdomains', () => {
      const result = parseURL('https://v1.api.example.com')
      
      expect(result.hostname).toBe('v1.api.example.com')
      expect(result.domain).toBe('example.com')
      expect(result.subdomain).toBe('v1.api')
    })

    test('parses URL with path', () => {
      const result = parseURL('https://example.com/path/to/resource')
      
      expect(result.pathname).toBe('/path/to/resource')
      expect(result.components.pathParts).toEqual(['path', 'to', 'resource'])
    })

    test('parses URL with query parameters', () => {
      const result = parseURL('https://example.com?param1=value1&param2=value2')
      
      expect(result.search).toBe('?param1=value1&param2=value2')
      expect(result.searchParams).toEqual({
        param1: 'value1',
        param2: 'value2',
      })
      expect(result.components.queryParams).toEqual([
        { key: 'param1', value: 'value1' },
        { key: 'param2', value: 'value2' },
      ])
    })

    test('parses URL with hash fragment', () => {
      const result = parseURL('https://example.com#section')
      
      expect(result.hash).toBe('#section')
    })

    test('parses URL with port', () => {
      const result = parseURL('https://example.com:8080')
      
      expect(result.port).toBe(8080)
    })

    test('parses complete URL with all components', () => {
      const result = parseURL('https://api.example.com:8080/v1/users?limit=10&offset=20#results')
      
      expect(result.protocol).toBe('https:')
      expect(result.hostname).toBe('api.example.com')
      expect(result.domain).toBe('example.com')
      expect(result.subdomain).toBe('api')
      expect(result.port).toBe(8080)
      expect(result.pathname).toBe('/v1/users')
      expect(result.searchParams).toEqual({ limit: '10', offset: '20' })
      expect(result.hash).toBe('#results')
      expect(result.components.pathParts).toEqual(['v1', 'users'])
    })

    test('handles URL without protocol by adding https', () => {
      const result = parseURL('example.com')
      
      expect(result.original).toBe('example.com')
      expect(result.protocol).toBe('https:')
      expect(result.hostname).toBe('example.com')
    })

    test('parses IPv4 addresses', () => {
      const result = parseURL('https://192.168.1.1:8080')
      
      expect(result.hostname).toBe('192.168.1.1')
      expect(result.domain).toBe('192.168.1.1')
      expect(result.subdomain).toBe('')
      expect(result.isIP).toBe(true)
      expect(result.isIPv4).toBe(true)
      expect(result.isIPv6).toBe(false)
      expect(result.port).toBe(8080)
    })

    test('parses IPv6 addresses', () => {
      const result = parseURL('https://[::1]:8080')
      
      // URL constructor keeps brackets for IPv6 addresses
      expect(result.hostname).toBe('[::1]') 
      expect(result.domain).toBe('[::1]')
      expect(result.isIP).toBe(true)
      expect(result.isIPv4).toBe(false)
      expect(result.isIPv6).toBe(true)
    })

    test('parses compound TLD domains', () => {
      const result = parseURL('https://api.example.co.uk')
      
      expect(result.hostname).toBe('api.example.co.uk')
      expect(result.domain).toBe('example.co.uk')
      expect(result.subdomain).toBe('api')
    })

    test('handles URL encoding in paths', () => {
      const result = parseURL('https://example.com/path%20with%20spaces/file%2Ename.txt')
      
      expect(result.components.pathParts).toEqual(['path with spaces', 'file.name.txt'])
    })

    test('handles localhost', () => {
      const result = parseURL('http://localhost:3000')
      
      expect(result.hostname).toBe('localhost')
      expect(result.domain).toBe('localhost')
      expect(result.subdomain).toBe('')
      expect(result.port).toBe(3000)
    })

    test('throws error for invalid URLs', () => {
      expect(() => parseURL(':/invalid')).toThrow('Invalid URL format')
      expect(() => parseURL('')).toThrow('Invalid URL format')
    })
  })

  describe('getRootDomain', () => {
    test('returns root domain for simple domain', () => {
      const parsed = parseURL('https://example.com')
      expect(getRootDomain(parsed)).toBe('example.com')
    })

    test('returns root domain for subdomain', () => {
      const parsed = parseURL('https://api.example.com')
      expect(getRootDomain(parsed)).toBe('example.com')
    })

    test('returns IP for IP addresses', () => {
      const parsed = parseURL('https://192.168.1.1')
      expect(getRootDomain(parsed)).toBe('192.168.1.1')
    })
  })

  describe('getFullDomain', () => {
    test('returns domain without subdomain', () => {
      const parsed = parseURL('https://example.com')
      expect(getFullDomain(parsed)).toBe('example.com')
    })

    test('returns full domain with subdomain', () => {
      const parsed = parseURL('https://api.example.com')
      expect(getFullDomain(parsed)).toBe('api.example.com')
    })
  })

  describe('hasSubdomain', () => {
    test('returns false for domain without subdomain', () => {
      const parsed = parseURL('https://example.com')
      expect(hasSubdomain(parsed, 'api')).toBe(false)
    })

    test('returns true for matching subdomain', () => {
      const parsed = parseURL('https://api.example.com')
      expect(hasSubdomain(parsed, 'api')).toBe(true)
    })

    test('returns true for nested subdomain', () => {
      const parsed = parseURL('https://v1.api.example.com')
      expect(hasSubdomain(parsed, 'api')).toBe(true)
      expect(hasSubdomain(parsed, 'v1')).toBe(true)
    })
  })

  describe('getSubdomains', () => {
    test('returns empty array for domain without subdomain', () => {
      const parsed = parseURL('https://example.com')
      expect(getSubdomains(parsed)).toEqual([])
    })

    test('returns single subdomain', () => {
      const parsed = parseURL('https://api.example.com')
      expect(getSubdomains(parsed)).toEqual(['api'])
    })

    test('returns multiple subdomains in order', () => {
      const parsed = parseURL('https://v1.api.example.com')
      expect(getSubdomains(parsed)).toEqual(['v1', 'api'])
    })
  })

  describe('query parameter functions', () => {
    const parsedWithParams = parseURL('https://example.com?param1=value1&param2=value2&empty=')

    describe('hasQueryParams', () => {
      test('returns true for URL with query params', () => {
        expect(hasQueryParams(parsedWithParams)).toBe(true)
      })

      test('returns false for URL without query params', () => {
        const parsed = parseURL('https://example.com')
        expect(hasQueryParams(parsed)).toBe(false)
      })
    })

    describe('getQueryParam', () => {
      test('returns parameter value', () => {
        expect(getQueryParam(parsedWithParams, 'param1')).toBe('value1')
        expect(getQueryParam(parsedWithParams, 'param2')).toBe('value2')
      })

      test('returns undefined for non-existent parameter', () => {
        expect(getQueryParam(parsedWithParams, 'nonexistent')).toBeUndefined()
      })

      test('returns empty string for empty parameter', () => {
        expect(getQueryParam(parsedWithParams, 'empty')).toBe('')
      })
    })

    describe('hasQueryParam', () => {
      test('returns true for existing parameter', () => {
        expect(hasQueryParam(parsedWithParams, 'param1')).toBe(true)
      })

      test('returns false for non-existent parameter', () => {
        expect(hasQueryParam(parsedWithParams, 'nonexistent')).toBe(false)
      })
    })
  })

  describe('file extension functions', () => {
    describe('getFileExtension', () => {
      test('returns extension for file URL', () => {
        const parsed = parseURL('https://example.com/file.pdf')
        expect(getFileExtension(parsed)).toBe('pdf')
      })

      test('returns extension for nested file URL', () => {
        const parsed = parseURL('https://example.com/path/to/document.docx')
        expect(getFileExtension(parsed)).toBe('docx')
      })

      test('returns undefined for URL without extension', () => {
        const parsed = parseURL('https://example.com/path')
        expect(getFileExtension(parsed)).toBeUndefined()
      })

      test('returns undefined for directory-like URL', () => {
        const parsed = parseURL('https://example.com/path/')
        expect(getFileExtension(parsed)).toBeUndefined()
      })

      test('handles multiple dots correctly', () => {
        const parsed = parseURL('https://example.com/file.min.js')
        expect(getFileExtension(parsed)).toBe('js')
      })
    })

    describe('isFileURL', () => {
      test('returns true for file URLs', () => {
        const parsed = parseURL('https://example.com/file.pdf')
        expect(isFileURL(parsed)).toBe(true)
      })

      test('returns false for non-file URLs', () => {
        const parsed = parseURL('https://example.com/path')
        expect(isFileURL(parsed)).toBe(false)
      })
    })
  })

  describe('getURLDepth', () => {
    test('returns 0 for root URL', () => {
      const parsed = parseURL('https://example.com')
      expect(getURLDepth(parsed)).toBe(0)
    })

    test('returns correct depth for nested paths', () => {
      const parsed = parseURL('https://example.com/level1/level2/level3')
      expect(getURLDepth(parsed)).toBe(3)
    })

    test('ignores trailing slash', () => {
      const parsed = parseURL('https://example.com/level1/level2/')
      expect(getURLDepth(parsed)).toBe(2)
    })
  })

  describe('edge cases', () => {
    test('handles URLs with unusual but valid characters', () => {
      const result = parseURL('https://test-site.co.uk/path_with-special.chars')
      
      expect(result.domain).toBe('test-site.co.uk')
      expect(result.components.pathParts).toEqual(['path_with-special.chars'])
    })

    test('handles URLs with encoded characters', () => {
      const result = parseURL('https://example.com/search?q=hello%20world')
      
      expect(result.searchParams.q).toBe('hello world')
    })

    test('handles URLs with international characters', () => {
      const result = parseURL('https://münchen.de/straße')
      
      // URL constructor converts international domains to punycode
      expect(result.hostname).toBe('xn--mnchen-3ya.de')
      expect(result.components.pathParts).toEqual(['straße'])
    })

    test('handles very long URLs', () => {
      const longPath = 'a'.repeat(100)
      const result = parseURL(`https://example.com/${longPath}`)
      
      expect(result.components.pathParts).toEqual([longPath])
    })

    test('handles URLs with many query parameters', () => {
      const manyParams = Array.from({ length: 20 }, (_, i) => `param${i}=value${i}`).join('&')
      const result = parseURL(`https://example.com?${manyParams}`)
      
      expect(result.components.queryParams).toHaveLength(20)
      expect(result.searchParams.param0).toBe('value0')
      expect(result.searchParams.param19).toBe('value19')
    })
  })
})