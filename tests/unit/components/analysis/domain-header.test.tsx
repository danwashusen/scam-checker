import { render, screen } from '@testing-library/react'
import { DomainHeader } from '@/components/analysis/domain-header'

describe('DomainHeader', () => {
  it('extracts and displays domain from standard URL', () => {
    render(<DomainHeader url="https://example.com/path" />)
    
    expect(screen.getByTestId('domain-header')).toHaveTextContent('example.com')
  })

  it('removes www prefix from domain', () => {
    render(<DomainHeader url="https://www.google.com" />)
    
    expect(screen.getByTestId('domain-header')).toHaveTextContent('google.com')
  })

  it('handles IP addresses correctly', () => {
    render(<DomainHeader url="http://192.168.1.1:8080/path" />)
    
    expect(screen.getByTestId('domain-header')).toHaveTextContent('192.168.1.1')
  })

  it('handles IPv6 addresses correctly', () => {
    render(<DomainHeader url="http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080" />)
    
    // IPv6 addresses get normalized by the URL constructor
    expect(screen.getByTestId('domain-header')).toHaveTextContent('[2001:db8:85a3::8a2e:370:7334]')
  })

  it('handles malformed URLs gracefully with fallback', () => {
    render(<DomainHeader url="not-a-valid-url" />)
    
    // Should fallback to showing something reasonable
    expect(screen.getByTestId('domain-header')).toBeInTheDocument()
    expect(screen.getByTestId('domain-header').textContent).toBeDefined()
  })

  it('handles internationalized domain names (IDN)', () => {
    render(<DomainHeader url="https://пример.испытание/path" />)
    
    // IDN domains get converted to punycode by URL constructor
    expect(screen.getByTestId('domain-header')).toHaveTextContent('xn--e1afmkfd.xn--80akhbyknj4f')
  })

  it('applies responsive typography classes', () => {
    render(<DomainHeader url="https://example.com" />)
    
    const header = screen.getByTestId('domain-header')
    expect(header).toHaveClass('text-lg', 'sm:text-2xl', 'lg:text-3xl')
    expect(header.tagName).toBe('H2')
  })

  it('applies custom className when provided', () => {
    render(<DomainHeader url="https://example.com" className="custom-class" />)
    
    expect(screen.getByTestId('domain-header')).toHaveClass('custom-class')
  })

  it('handles URL with port correctly', () => {
    render(<DomainHeader url="https://localhost:3000/dashboard" />)
    
    expect(screen.getByTestId('domain-header')).toHaveTextContent('localhost')
  })

  it('handles subdomain correctly', () => {
    render(<DomainHeader url="https://api.example.com/v1/users" />)
    
    expect(screen.getByTestId('domain-header')).toHaveTextContent('api.example.com')
  })
})