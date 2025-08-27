import { WhoisParser } from '../../../../src/lib/analysis/whois-parser'

describe('WhoisParser', () => {
  describe('parseWhoisResponse', () => {
    it('should parse basic WHOIS response with creation date', () => {
      const rawResponse = `
Domain Name: example.com
Registry Domain ID: 123456789
Registrar: Example Registrar Inc.
Creation Date: 2020-01-15T00:00:00Z
Registry Expiry Date: 2025-01-15T00:00:00Z
Updated Date: 2023-01-15T00:00:00Z
Registrar Registration Expiration Date: 2025-01-15T00:00:00Z
Name Server: ns1.example.com
Name Server: ns2.example.com
Domain Status: clientTransferProhibited
Registrant Organization: Example Organization
Registrant Country: US
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.registrationDate).toBeDefined()
      expect(result.expirationDate).toBeDefined()
      expect(result.updatedDate).toBeDefined()
      expect(result.registrar).toBe('Example Registrar Inc.')
      expect(result.nameservers).toContain('ns1.example.com')
      expect(result.nameservers).toContain('ns2.example.com')
      expect(result.status).toContain('clientTransferProhibited')
      expect(result.registrantCountry).toBe('US')
      expect(result.privacyProtected).toBe(false)
      expect(result.ageInDays).toBeGreaterThan(0)
    })

    it('should parse WHOIS response with privacy protection', () => {
      const rawResponse = `
Domain Name: private-domain.com
Registrar: Privacy Registrar
Creation Date: 2023-06-01T00:00:00Z
Registrant Organization: Redacted for Privacy
Registrant Country: Redacted for Privacy
Registrant Email: privacy@whoisguard.com
Admin Email: privacy@whoisguard.com
      `.trim()

      const result = WhoisParser.parseWhoisResponse('private-domain.com', rawResponse)

      expect(result.privacyProtected).toBe(true)
      expect(result.riskFactors.some(f => f.type === 'privacy')).toBe(true)
      expect(result.registrar).toBe('Privacy Registrar')
    })

    it('should handle missing creation date', () => {
      const rawResponse = `
Domain Name: example.com
Registrar: Example Registrar Inc.
Registry Expiry Date: 2025-01-15T00:00:00Z
Name Server: ns1.example.com
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.registrationDate).toBeNull()
      expect(result.ageInDays).toBeNull()
      expect(result.confidence).toBeLessThan(1) // Lower confidence without age data
    })

    it('should handle very new domain (< 30 days)', () => {
      const recent = new Date()
      recent.setDate(recent.getDate() - 15) // 15 days ago
      
      const rawResponse = `
Domain Name: newdomain.com
Creation Date: ${recent.toISOString()}
Registrar: Example Registrar Inc.
      `.trim()

      const result = WhoisParser.parseWhoisResponse('newdomain.com', rawResponse)

      expect(result.ageInDays).toBeLessThan(30)
      expect(result.riskFactors.some(f => f.type === 'age' && f.score >= 0.7)).toBe(true)
    })

    it('should handle mature domain (> 2 years)', () => {
      const rawResponse = `
Domain Name: olddomain.com
Creation Date: 2020-01-01T00:00:00Z
Registrar: Example Registrar Inc.
      `.trim()

      const result = WhoisParser.parseWhoisResponse('olddomain.com', rawResponse)

      expect(result.ageInDays).toBeGreaterThan(730) // More than 2 years
      expect(result.riskFactors.some(f => f.type === 'age' && f.score <= 0.2)).toBe(true)
    })

    it('should parse different date formats', () => {
      const testCases = [
        { input: '2023-01-15T00:00:00Z', expected: true },
        { input: '2023-01-15', expected: true },
        { input: '01/15/2023', expected: true },
        { input: '15/01/2023', expected: true },
        { input: '15.01.2023', expected: true },
        { input: '15-Jan-2023', expected: true },
        { input: 'invalid-date', expected: false },
      ]

      testCases.forEach(({ input, expected }) => {
        const rawResponse = `Creation Date: ${input}`
        const result = WhoisParser.parseWhoisResponse('test.com', rawResponse)
        
        if (expected) {
          expect(result.registrationDate).toBeDefined()
        } else {
          expect(result.registrationDate).toBeNull()
        }
      })
    })

    it('should extract nameservers correctly', () => {
      const rawResponse = `
Name Server: ns1.example.com
Name Server: ns2.example.com
Nameserver: ns3.example.com
NServer: ns4.example.com
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.nameservers).toContain('ns1.example.com')
      expect(result.nameservers).toContain('ns2.example.com')
      expect(result.nameservers).toContain('ns3.example.com')
      expect(result.nameservers).toContain('ns4.example.com')
      expect(result.nameservers).toHaveLength(4)
    })

    it('should extract domain statuses correctly', () => {
      const rawResponse = `
Status: clientTransferProhibited
Domain Status: clientUpdateProhibited
Status: active
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.status).toContain('clientTransferProhibited')
      expect(result.status).toContain('clientUpdateProhibited')
      expect(result.status).toContain('active')
    })

    it('should detect suspicious domain statuses', () => {
      const rawResponse = `
Domain Name: suspicious.com
Creation Date: 2023-01-15T00:00:00Z
Status: clientHold
Status: serverHold
      `.trim()

      const result = WhoisParser.parseWhoisResponse('suspicious.com', rawResponse)

      expect(result.riskFactors.some(f => f.type === 'status')).toBe(true)
      expect(result.score).toBeGreaterThan(0.5) // Should have higher risk score
    })

    it('should handle known registrars with trust scores', () => {
      const rawResponse = `
Domain Name: example.com
Creation Date: 2023-01-15T00:00:00Z
Registrar: GoDaddy.com, LLC
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.riskFactors.some(f => f.type === 'registrar')).toBe(true)
      // GoDaddy should have a lower risk score due to high trust
      const registrarFactor = result.riskFactors.find(f => f.type === 'registrar')
      expect(registrarFactor?.score).toBeLessThan(0.1)
    })

    it('should handle unknown registrars', () => {
      const rawResponse = `
Domain Name: example.com
Creation Date: 2023-01-15T00:00:00Z
Registrar: Unknown Sketchy Registrar LLC
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.riskFactors.some(f => f.type === 'registrar')).toBe(true)
      // Unknown registrar should have higher risk
      const registrarFactor = result.riskFactors.find(f => f.type === 'registrar')
      expect(registrarFactor?.score).toBe(0.2)
    })

    it('should calculate overall score correctly', () => {
      // Very new domain with privacy protection
      const recent = new Date()
      recent.setDate(recent.getDate() - 5) // 5 days ago
      
      const rawResponse = `
Domain Name: risky.com
Creation Date: ${recent.toISOString()}
Registrant Organization: Redacted for Privacy
      `.trim()

      const result = WhoisParser.parseWhoisResponse('risky.com', rawResponse)

      expect(result.score).toBeGreaterThan(0.8) // Should be high risk
      expect(result.riskFactors.length).toBeGreaterThan(1) // Multiple risk factors
    })

    it('should calculate confidence based on data availability', () => {
      // Complete WHOIS data
      const completeResponse = `
Domain Name: complete.com
Creation Date: 2023-01-15T00:00:00Z
Registrar: Example Registrar Inc.
Registrant Organization: Example Org
      `.trim()

      // Minimal WHOIS data
      const minimalResponse = `
Domain Name: minimal.com
      `.trim()

      const completeResult = WhoisParser.parseWhoisResponse('complete.com', completeResponse)
      const minimalResult = WhoisParser.parseWhoisResponse('minimal.com', minimalResponse)

      expect(completeResult.confidence).toBeGreaterThan(minimalResult.confidence)
      expect(completeResult.confidence).toBeGreaterThan(0.8)
      expect(minimalResult.confidence).toBeLessThan(0.6)
    })
  })

  describe('getDomainAgeRisk', () => {
    it('should categorize domain ages correctly', () => {
      expect(WhoisParser.getDomainAgeRisk(15)).toBe('very_new') // < 30 days
      expect(WhoisParser.getDomainAgeRisk(60)).toBe('new') // 30-90 days
      expect(WhoisParser.getDomainAgeRisk(180)).toBe('recent') // 90-365 days
      expect(WhoisParser.getDomainAgeRisk(500)).toBe('established') // 1-2 years
      expect(WhoisParser.getDomainAgeRisk(1000)).toBe('mature') // > 2 years
      expect(WhoisParser.getDomainAgeRisk(null)).toBe('recent') // Unknown age
    })
  })

  describe('privacy protection detection', () => {
    const privacyIndicators = [
      'privacy',
      'redacted',
      'whoisguard',
      'whoisprotect',
      'domains by proxy',
      'contact privacy',
      'private registration',
      'redacted for privacy',
      'data protected',
      'not disclosed'
    ]

    privacyIndicators.forEach(indicator => {
      it(`should detect privacy protection with indicator: ${indicator}`, () => {
        const rawResponse = `
Domain Name: example.com
Creation Date: 2023-01-15T00:00:00Z
Registrant Organization: ${indicator.toUpperCase()}
        `.trim()

        const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)
        expect(result.privacyProtected).toBe(true)
      })
    })

    it('should not detect privacy protection with normal data', () => {
      const rawResponse = `
Domain Name: example.com
Creation Date: 2023-01-15T00:00:00Z
Registrant Organization: Acme Corporation
Registrant Country: US
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)
      expect(result.privacyProtected).toBe(false)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty WHOIS response', () => {
      const result = WhoisParser.parseWhoisResponse('example.com', '')

      expect(result.registrationDate).toBeNull()
      expect(result.ageInDays).toBeNull()
      expect(result.registrar).toBeNull()
      expect(result.nameservers).toEqual([])
      expect(result.status).toEqual([])
      expect(result.confidence).toBeLessThan(0.6) // Low confidence
    })

    it('should handle malformed WHOIS response', () => {
      const rawResponse = `
Invalid data
Random text without structure
Not a proper WHOIS response
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.registrationDate).toBeNull()
      expect(result.ageInDays).toBeNull()
      expect(result.registrar).toBeNull()
      expect(result.confidence).toBeLessThan(0.6)
    })

    it('should handle WHOIS response with colons in values', () => {
      const rawResponse = `
Domain Name: example.com
Registrar: Registrar Inc.: The Best Registrar
Creation Date: 2023-01-15T00:00:00Z
      `.trim()

      const result = WhoisParser.parseWhoisResponse('example.com', rawResponse)

      expect(result.registrar).toBe('Registrar Inc.: The Best Registrar')
      expect(result.registrationDate).toBeDefined()
    })
  })
})