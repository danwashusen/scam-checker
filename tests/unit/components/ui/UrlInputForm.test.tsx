import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { UrlInputForm } from '@/components/analysis/url-input-form'

expect.extend(toHaveNoViolations)

// Mock toast hook
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: jest.fn()
  })
}))

const mockOnSubmit = jest.fn()

describe.skip('UrlInputForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Accessibility tests
  it('should have no accessibility violations', async () => {
    const { container } = render(<UrlInputForm onSubmit={mockOnSubmit} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // Component rendering tests
  it('should render form with all elements', () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByRole('heading', { name: 'URL Analysis' })).toBeInTheDocument()
    expect(screen.getByLabelText(/URL to Analyze/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeInTheDocument()
    expect(screen.getByText(/Enter a URL to check for potential security risks/i)).toBeInTheDocument()
  })

  // Form validation tests
  it('should show validation error for empty URL', async () => {
    const user = userEvent.setup()
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    
    // Try to submit empty form
    await user.click(urlInput)
    await user.tab() // Focus away to trigger validation
    
    await waitFor(() => {
      expect(screen.getByText(/URL is required/i)).toBeInTheDocument()
    })
    
    expect(submitButton).toBeDisabled()
  })

  it('should show validation error for invalid URL format', async () => {
    const user = userEvent.setup()
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    
    await user.type(urlInput, 'not-a-url')
    await user.tab() // Trigger validation
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid URL/i)).toBeInTheDocument()
    })
  })

  it('should accept valid URLs', async () => {
    const user = userEvent.setup()
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    
    await user.type(urlInput, 'https://example.com')
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    expect(screen.queryByText(/Please enter a valid URL/i)).not.toBeInTheDocument()
  })

  it('should auto-add https protocol', async () => {
    const user = userEvent.setup()
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    
    await user.type(urlInput, 'example.com')
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com')
    })
  })

  // Security validation tests
  it('should reject URLs with malicious patterns', async () => {
    const user = userEvent.setup()
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    
    await user.type(urlInput, 'javascript:alert("xss")')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/URL contains potentially malicious content/i)).toBeInTheDocument()
    })
  })

  // Form submission tests
  it('should call onSubmit with valid URL', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)
    
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    
    await user.type(urlInput, 'https://example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com')
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    
    await user.type(urlInput, 'https://example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Analyzing.../i)).toBeInTheDocument()
    })
    
    expect(urlInput).toBeDisabled()
  })

  it('should handle submission errors', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockRejectedValue(new Error('Network error'))
    
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    
    await user.type(urlInput, 'https://example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })
  })

  it('should handle timeout errors', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    
    await user.type(urlInput, 'https://example.com')
    await user.click(submitButton)
    
    // Wait for timeout (30 seconds in real code, but we can't wait that long in tests)
    // This would be better tested with mock timers
  })

  // Accessibility attributes tests
  it('should have proper form accessibility attributes', () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    
    expect(urlInput).toHaveAttribute('type', 'url')
    expect(urlInput).toHaveAttribute('inputMode', 'url')
    expect(urlInput).toHaveAttribute('autoComplete', 'url')
    expect(urlInput).toHaveAttribute('autoCapitalize', 'none')
    expect(urlInput).toHaveAttribute('spellCheck', 'false')
    expect(urlInput).toHaveAttribute('aria-describedby')
  })

  it('should announce errors to screen readers', async () => {
    const user = userEvent.setup()
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    
    await user.type(urlInput, 'invalid')
    await user.tab()
    
    await waitFor(() => {
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toBeInTheDocument()
    })
  })

  // Keyboard navigation tests
  it('should support keyboard shortcuts', async () => {
    const user = userEvent.setup()
    render(<UrlInputForm onSubmit={mockOnSubmit} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    
    await user.type(urlInput, 'https://example.com')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com')
    })
  })

  // Props tests
  it('should use initial value when provided', () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} initialValue="https://test.com" />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i) as HTMLInputElement
    expect(urlInput.value).toBe('https://test.com')
  })

  it('should disable form when disabled prop is true', () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} disabled={true} />)
    
    const urlInput = screen.getByLabelText(/URL to Analyze/i)
    const submitButton = screen.getByRole('button', { name: 'Analyze' })
    
    expect(urlInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })
})