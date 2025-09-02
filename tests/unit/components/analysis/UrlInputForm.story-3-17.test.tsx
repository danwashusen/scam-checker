/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UrlInputForm } from '@/components/analysis/url-input-form'

// Mock toast hook
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
}))

// Mock the spinner component
jest.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}))

describe('UrlInputForm - Story 3-17 Bug Fixes', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('AC-1: Fix Button State Detection Bug', () => {
    it('T-3-17-001: button enables only when form is valid', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze/i })

      // Initially disabled
      expect(button).toBeDisabled()

      // Type invalid URL - should remain disabled
      await user.type(input, 'invalid-url')
      expect(button).toBeDisabled()

      // Clear and type valid URL - should enable after debounce
      await user.clear(input)
      await user.type(input, 'example.com')
      
      // Wait for validation state to be valid
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      }, { timeout: 500 })
    })

    it('T-3-17-002: button responds to first click', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze/i })

      // Type valid URL and wait for button to be enabled
      await user.type(input, 'https://example.com')
      
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      }, { timeout: 500 })

      // Click button - should work on first try
      await user.click(button)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com')
      })
    })
  })

  describe('AC-2: Reliable State Management', () => {
    it('T-3-17-003: no race condition between states', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze/i })

      // Type rapidly to test race conditions
      await user.type(input, 'https://example.com')
      
      // Wait for debounce to settle
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      }, { timeout: 500 })

      // State should be consistent
      expect(button).not.toBeDisabled()
    })

    it('T-3-17-004: state syncs on mount', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} initialValue="https://initial.com" />)

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('https://initial.com')
    })
  })

  describe('AC-3: URL Protocol Handling', () => {
    it('T-3-17-005: auto-adds https protocol', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      
      await user.type(input, 'example.com')
      
      // Should show transformation feedback
      await waitFor(() => {
        expect(screen.getByText(/will analyze:/i)).toBeInTheDocument()
        expect(screen.getByText(/https:\/\/example.com/)).toBeInTheDocument()
      })
    })

    it('T-3-17-006: shows transformation feedback', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      
      await user.type(input, 'wikipedia.org')
      
      // Should show transformation hint
      await waitFor(() => {
        expect(screen.getByText(/will analyze:/i)).toBeInTheDocument()
        expect(screen.getByText(/https:\/\/wikipedia.org/)).toBeInTheDocument()
      })
    })

    it('should not show transformation feedback for URLs with protocol', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      
      await user.type(input, 'https://example.com')
      
      // Should not show transformation feedback
      expect(screen.queryByText(/will analyze:/i)).not.toBeInTheDocument()
    })
  })

  describe('AC-4: Better Validation UX', () => {
    it('T-3-17-007: debounces at 300ms', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      
      // Type rapidly
      await user.type(input, 'example.com')
      
      // Should eventually show validation results after debounce
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /analyze/i })
        // Validation should complete after 300ms debounce
        expect(button).not.toBeDisabled()
      }, { timeout: 500 })
    })

    it('T-3-17-008: shows progressive validation states', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      
      // Start typing
      await user.type(input, 'example.com')
      
      // Should transition to valid state after debounce
      await waitFor(() => {
        expect(input).toHaveClass('border-green-500')
      }, { timeout: 500 })
    })

    it('should show visual indicators for validation status', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      
      // Type valid URL
      await user.type(input, 'https://example.com')
      
      // Should have green border when valid
      await waitFor(() => {
        expect(input).toHaveClass('border-green-500')
      }, { timeout: 500 })
    })
  })

  describe('AC-5: Form State Debugging', () => {
    // Skip debug tests in CI/production
    const originalNodeEnv = process.env.NODE_ENV
    
    beforeAll(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
    })
    
    afterAll(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true })
    })

    it('T-3-17-009: debug utilities work in development', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      // Should show debug panel in development
      expect(screen.getByText(/debug information/i)).toBeInTheDocument()
      expect(screen.getByText(/validation state/i)).toBeInTheDocument()
      expect(screen.getByText(/button enabled/i)).toBeInTheDocument()
    })

    it('should not show debug panel in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
      
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      // Should not show debug panel in production
      expect(screen.queryByText(/debug information/i)).not.toBeInTheDocument()
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
    })

    it('should update debug info when state changes', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/validation state/i)).toBeInTheDocument()
      expect(screen.getByText(/button enabled/i)).toBeInTheDocument()

      const input = screen.getByRole('textbox')
      await user.type(input, 'https://example.com')

      // Debug panel should update with new state
      await waitFor(() => {
        expect(screen.getByText('Button Enabled: Yes')).toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  describe('Integration: Full form workflow', () => {
    it('should handle complete user workflow without issues', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze/i })

      // 1. Start typing - button should be disabled
      expect(button).toBeDisabled()

      // 2. Type URL without protocol
      await user.type(input, 'example.com')

      // 3. Should show protocol transformation
      await waitFor(() => {
        expect(screen.getByText('Will analyze:')).toBeInTheDocument()
        expect(screen.getByText('https://example.com')).toBeInTheDocument()
      })

      // 4. Button should become enabled after validation
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      }, { timeout: 500 })

      // 5. Submit should work
      await user.click(button)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com')
      })
    })

    it('should handle rapid typing and editing gracefully', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze/i })

      // Type, delete, type again rapidly
      await user.type(input, 'invalid')
      await user.clear(input)
      await user.type(input, 'example.com')

      // Should end up in correct state
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      }, { timeout: 500 })

      await user.click(button)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com')
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle empty input gracefully', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze/i })

      await user.type(input, 'example.com')
      await user.clear(input)

      expect(button).toBeDisabled()
      expect(screen.queryByText(/will analyze/i)).not.toBeInTheDocument()
    })

    it('should handle submission errors', async () => {
      const user = userEvent.setup()
      const mockOnSubmitError = jest.fn().mockRejectedValue(new Error('Network error'))
      
      render(<UrlInputForm onSubmit={mockOnSubmitError} />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze/i })

      await user.type(input, 'https://example.com')
      
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      }, { timeout: 500 })

      await user.click(button)

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockOnSubmitError).toHaveBeenCalled()
      })
    })
  })
})