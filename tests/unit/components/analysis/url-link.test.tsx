import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { URLLink } from '@/components/analysis/url-link'

// Mock window.open
const mockWindowOpen = jest.fn()
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
})

// Mock console.log for testing logging
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {})

describe('URLLink', () => {
  beforeEach(() => {
    mockWindowOpen.mockClear()
    mockConsoleLog.mockClear()
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
  })

  describe('Safe URLs (score >= 60)', () => {
    it('navigates directly to safe URLs without warning', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://example.com" score={80} />)
      
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows full URL on desktop viewport', () => {
      render(<URLLink url="https://very-long-example-domain.com/path/to/resource" score={75} />)
      
      // Find the desktop span specifically
      const spans = screen.getAllByText('https://very-long-example-domain.com/path/to/resource')
      const desktopSpan = spans.find(span => span.className.includes('hidden lg:block'))
      expect(desktopSpan).toHaveClass('hidden', 'lg:block')
    })
  })

  describe('Risky URLs (score < 60)', () => {
    it('shows caution dialog for moderate risk (40-59)', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://suspicious.com" score={50} />)
      
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[URLLink] Warning shown for score:', 50)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Proceed with Caution')).toBeInTheDocument()
      expect(screen.getByText(/some risk indicators/i)).toBeInTheDocument()
    })

    it('shows high risk dialog for high risk (20-39)', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://malicious.com" score={30} />)
      
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('High Risk Detected')).toBeInTheDocument()
      expect(screen.getByText(/significant security concerns/i)).toBeInTheDocument()
      expect(screen.getByText('Continue at Own Risk')).toBeInTheDocument()
    })

    it('shows danger dialog for critical risk (0-19)', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://dangerous.com" score={10} />)
      
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Danger.*Critical Threats/i)).toBeInTheDocument()
      expect(screen.getByText(/critical security threats/i)).toBeInTheDocument()
    })

    it('allows user to continue after warning', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://risky.com" score={45} />)
      
      // Click URL to open dialog
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      // Click continue button
      const continueButton = screen.getByText('Continue with Caution')
      await user.click(continueButton)
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[URLLink] User confirmed navigation despite warning, score:', 45)
      expect(mockWindowOpen).toHaveBeenCalledWith('https://risky.com', '_blank', 'noopener,noreferrer')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('allows user to cancel navigation', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://risky.com" score={35} />)
      
      // Click URL to open dialog
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      // Click cancel button
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[URLLink] User cancelled navigation, score:', 35)
      expect(mockWindowOpen).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays URL in dialog', async () => {
      const user = userEvent.setup()
      const testUrl = 'https://test-domain.com/path'
      render(<URLLink url={testUrl} score={25} />)
      
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      // Verify dialog is open and contains URL to visit text
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('URL to visit:')).toBeInTheDocument()
      // URL should appear in the dialog content (as well as the button)
      const urlTexts = screen.getAllByText(testUrl)
      expect(urlTexts.length).toBeGreaterThan(1) // Should be in both button and dialog
    })
  })

  describe('Responsive display', () => {
    it('shows domain only on mobile', () => {
      render(<URLLink url="https://example.com/very/long/path/to/resource" score={80} />)
      
      const mobileSpan = screen.getByText('example.com')
      expect(mobileSpan).toHaveClass('block', 'sm:hidden')
    })

    it('shows full URL with CSS truncation on tablet', () => {
      const longUrl = 'https://very-long-example-domain-name.com/path/to/some/resource'
      render(<URLLink url={longUrl} score={80} />)
      
      // Find the tablet span specifically (should have truncate class)
      const spans = screen.getAllByText(longUrl)
      const tabletSpan = spans.find(span => span.className.includes('truncate max-w-[50ch]'))
      expect(tabletSpan).toHaveClass('hidden', 'sm:block', 'lg:hidden', 'truncate', 'max-w-[50ch]')
    })

    it('applies responsive CSS classes correctly', () => {
      render(<URLLink url="https://example.com" score={80} />)
      
      const button = screen.getByTestId('url-link-button')
      expect(button).toHaveClass('break-all', 'line-clamp-1', 'sm:line-clamp-2', 'lg:line-clamp-none')
    })
  })

  describe('Accessibility', () => {
    it('has proper link icon', () => {
      render(<URLLink url="https://example.com" score={80} />)
      
      // Check for link icon presence (Lucide React icons have specific attributes)
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    it('dialog has proper ARIA attributes', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://risky.com" score={30} />)
      
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('role', 'dialog')
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles score exactly at threshold (60)', () => {
      render(<URLLink url="https://borderline.com" score={60} />)
      
      // Score 60 should be considered safe (>=60)
      const button = screen.getByTestId('url-link-button')
      fireEvent.click(button)
      
      expect(mockWindowOpen).toHaveBeenCalledWith('https://borderline.com', '_blank', 'noopener,noreferrer')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('handles score just below threshold (59)', async () => {
      const user = userEvent.setup()
      render(<URLLink url="https://almostgood.com" score={59} />)
      
      const button = screen.getByTestId('url-link-button')
      await user.click(button)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })
  })
})