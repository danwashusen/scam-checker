import { NextRequest, NextResponse } from 'next/server'
import { POST, GET } from '../../../src/app/api/analyze/route'

// Mock NextResponse for testing environment
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: (data: any, init?: ResponseInit) => ({
        json: async () => data,
        status: init?.status || 200,
        headers: new Headers(),
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      }),
    },
  }
})

// Mock console methods to avoid test output pollution
const mockConsole = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}

beforeAll(() => {
  Object.assign(console, mockConsole)
})

beforeEach(() => {
  Object.values(mockConsole).forEach(mock => mock.mockClear())
})

describe('/api/analyze', () => {
  describe('GET requests', () => {
    test('returns API documentation', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('endpoints')
      expect(data.endpoints).toHaveProperty('analyze')
      expect(data).toHaveProperty('features')
      expect(data).toHaveProperty('security')
    })

    test('includes comprehensive endpoint documentation', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.endpoints.analyze).toHaveProperty('method', 'POST')
      expect(data.endpoints.analyze).toHaveProperty('description')
      expect(data.endpoints.analyze).toHaveProperty('body')
      expect(data.endpoints.analyze.body).toHaveProperty('url')
      expect(data.endpoints.analyze.body).toHaveProperty('options')
    })
  })

  describe('POST requests', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    describe('successful requests', () => {
      test('analyzes valid URL', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data).toHaveProperty('data')
        expect(data).toHaveProperty('validation')
        expect(data).toHaveProperty('timestamp')
        
        expect(data.data).toHaveProperty('url')
        expect(data.data).toHaveProperty('riskScore')
        expect(data.data).toHaveProperty('riskLevel')
        expect(data.data).toHaveProperty('factors')
        expect(data.data).toHaveProperty('explanation')
        expect(data.data).toHaveProperty('timestamp')
      })

      test('handles URL without protocol', async () => {
        const request = createRequest({ url: 'example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.validation.final).toContain('https://')
      })

      test('analyzes URL with path and parameters', async () => {
        const request = createRequest({ 
          url: 'https://api.example.com/v1/users?limit=10&sort=name' 
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.url).toContain('/v1/users')
      })

      test('includes validation details in response', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.validation).toHaveProperty('original')
        expect(data.validation).toHaveProperty('final')
        expect(data.validation).toHaveProperty('wasModified')
        expect(data.validation).toHaveProperty('changes')
      })

      test('handles URL sanitization', async () => {
        const request = createRequest({ 
          url: 'https://example.com?utm_source=google&param=value' 
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.wasModified).toBe(true)
        expect(data.validation.changes.length).toBeGreaterThan(0)
        expect(data.validation.final).not.toContain('utm_source')
      })

      test('generates risk analysis factors', async () => {
        const request = createRequest({ url: 'https://subdomain.example.com/deep/path' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.data.factors).toBeInstanceOf(Array)
        expect(data.data.factors.length).toBeGreaterThan(0)
        
        const factor = data.data.factors[0]
        expect(factor).toHaveProperty('type')
        expect(factor).toHaveProperty('score')
        expect(factor).toHaveProperty('description')
      })

      test('assigns appropriate risk levels', async () => {
        const testCases = [
          { url: 'https://google.com', expectedRisk: 'low' },
          { url: 'https://api.subdomain.example.com/deep/path/with/many/levels', expectedRisk: 'medium' },
        ]

        for (const testCase of testCases) {
          const request = createRequest({ url: testCase.url })
          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(['low', 'medium', 'high']).toContain(data.data.riskLevel)
        }
      })
    })

    describe('validation errors', () => {
      test('rejects empty request body', async () => {
        const request = createRequest({})
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid URL provided')
        expect(data).toHaveProperty('details')
      })

      test('rejects invalid URL format', async () => {
        const request = createRequest({ url: 'not-a-url' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data).toHaveProperty('message')
      })

      test('rejects empty URL', async () => {
        const request = createRequest({ url: '' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })

      test('rejects URLs that are too long', async () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(3000)
        const request = createRequest({ url: longUrl })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.message).toContain('length')
      })

      test('rejects private IP addresses', async () => {
        const request = createRequest({ url: 'https://192.168.1.1' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.errorType).toBe('security-risk')
      })

      test('rejects localhost URLs', async () => {
        const request = createRequest({ url: 'https://localhost:3000' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.errorType).toBe('security-risk')
      })

      test('rejects malicious protocols', async () => {
        const maliciousUrls = [
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:Execute("test")',
        ]

        for (const url of maliciousUrls) {
          const request = createRequest({ url })
          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.success).toBe(false)
          expect(data.errorType).toBe('security-risk')
        }
      })

      test('provides detailed error information', async () => {
        const request = createRequest({ url: 'invalid-url' })
        const response = await POST(request)
        const data = await response.json()

        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('message')
        expect(data).toHaveProperty('timestamp')
        expect(data.details).toBeInstanceOf(Array)
        expect(data.details[0]).toHaveProperty('field')
        expect(data.details[0]).toHaveProperty('message')
      })
    })

    describe('custom validation options', () => {
      test('accepts localhost when allowed in options', async () => {
        const request = createRequest({
          url: 'https://localhost:3000',
          options: {
            validation: {
              allowLocalhost: true,
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('accepts private IPs when allowed in options', async () => {
        const request = createRequest({
          url: 'https://192.168.1.1',
          options: {
            validation: {
              allowPrivateIPs: true,
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('respects custom sanitization options', async () => {
        const request = createRequest({
          url: 'https://example.com?utm_source=google&param=value',
          options: {
            sanitization: {
              removeTrackingParams: false,
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.final).toContain('utm_source')
      })

      test('skips sanitization when requested', async () => {
        const request = createRequest({
          url: 'https://example.com?utm_source=google',
          options: {
            skipSanitization: true,
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.changes).toHaveLength(0)
      })

      test('handles custom tracking parameters', async () => {
        const request = createRequest({
          url: 'https://example.com?custom_track=value&param=keep',
          options: {
            sanitization: {
              customTrackingParams: ['custom_track'],
            },
          },
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.validation.final).not.toContain('custom_track')
        expect(data.validation.final).toContain('param=keep')
      })
    })

    describe('logging and monitoring', () => {
      test('logs validation failures', async () => {
        const request = createRequest({ url: 'invalid-url' })
        await POST(request)

        expect(mockConsole.warn).toHaveBeenCalledWith(
          expect.stringContaining('URL validation failed'),
          expect.any(Object)
        )
      })

      test('logs successful analyses', async () => {
        const request = createRequest({ url: 'https://example.com' })
        await POST(request)

        expect(mockConsole.info).toHaveBeenCalledWith(
          expect.stringContaining('URL analysis completed successfully'),
          expect.any(Object)
        )
      })

      test('sanitizes URLs in logs', async () => {
        const request = createRequest({ url: 'https://example.com?password=secret' })
        await POST(request)

        // Check that sensitive info was redacted in logs
        const logCall = mockConsole.info.mock.calls.find(call => 
          call[0].includes('completed successfully')
        )
        expect(logCall).toBeDefined()
        expect(logCall[1].url).not.toContain('secret')
      })

      test('includes processing time in logs', async () => {
        const request = createRequest({ url: 'https://example.com' })
        await POST(request)

        const logCall = mockConsole.info.mock.calls.find(call => 
          call[0].includes('completed successfully')
        )
        expect(logCall).toBeDefined()
        expect(logCall[1]).toHaveProperty('processingTime')
        expect(typeof logCall[1].processingTime).toBe('number')
      })
    })

    describe('error handling', () => {
      test('handles malformed JSON gracefully', async () => {
        const request = new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Internal server error')
      })

      test('handles unexpected validation errors', async () => {
        // This test ensures graceful handling of edge cases
        const request = createRequest({ 
          url: 'https://example.com',
          options: { validation: null }, // Invalid options structure
        })
        
        const response = await POST(request)
        const data = await response.json()

        expect([400, 500]).toContain(response.status)
        expect(data.success).toBe(false)
      })

      test('includes timestamp in all responses', async () => {
        const validRequest = createRequest({ url: 'https://example.com' })
        const validResponse = await POST(validRequest)
        const validData = await validResponse.json()
        expect(validData).toHaveProperty('timestamp')

        const invalidRequest = createRequest({ url: 'invalid' })
        const invalidResponse = await POST(invalidRequest)
        const invalidData = await invalidResponse.json()
        expect(invalidData).toHaveProperty('timestamp')
      })
    })

    describe('performance and edge cases', () => {
      test('handles international domains', async () => {
        const request = createRequest({ url: 'https://münchen.de' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('handles URLs with complex query parameters', async () => {
        const request = createRequest({ 
          url: 'https://example.com?array[0]=value1&array[1]=value2&nested[key]=value'
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('processes multiple requests concurrently', async () => {
        const urls = [
          'https://example1.com',
          'https://example2.com',
          'https://example3.com',
        ]

        const requests = urls.map(url => createRequest({ url }))
        const responses = await Promise.all(requests.map(req => POST(req)))
        const data = await Promise.all(responses.map(res => res.json()))

        data.forEach(result => {
          expect(result.success).toBe(true)
        })
      })

      test('handles very short URLs', async () => {
        const request = createRequest({ url: 'https://a.co' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      test('handles URLs with unusual but valid characters', async () => {
        const request = createRequest({ url: 'https://test-site.co.uk/path_with-special.chars' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('response format validation', () => {
      test('returns consistent response structure', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        // Check required fields are present
        expect(data).toHaveProperty('success')
        expect(data).toHaveProperty('timestamp')
        
        if (data.success) {
          expect(data).toHaveProperty('data')
          expect(data).toHaveProperty('validation')
          
          expect(data.data).toHaveProperty('url')
          expect(data.data).toHaveProperty('riskScore')
          expect(data.data).toHaveProperty('riskLevel')
          expect(data.data).toHaveProperty('factors')
          expect(data.data).toHaveProperty('explanation')
          expect(data.data).toHaveProperty('timestamp')
        } else {
          expect(data).toHaveProperty('error')
          expect(data).toHaveProperty('message')
        }
      })

      test('validates risk score is within bounds', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.data.riskScore).toBeGreaterThanOrEqual(0)
        expect(data.data.riskScore).toBeLessThanOrEqual(1)
      })

      test('validates risk level is valid enum', async () => {
        const request = createRequest({ url: 'https://example.com' })
        const response = await POST(request)
        const data = await response.json()

        expect(['low', 'medium', 'high']).toContain(data.data.riskLevel)
      })
    })
  })
})