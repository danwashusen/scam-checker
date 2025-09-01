/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UrlInputForm } from '@/components/analysis/url-input-form'
import { useURLValidation } from '@/hooks/useUrlValidation'

// Mock the validation hook
jest.mock('@/hooks/useUrlValidation')

// Mock toast hook
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}))

const mockUseURLValidation = useURLValidation as jest.MockedFunction<typeof useURLValidation>

describe.skip('UrlInputForm', () => {
  const mockSetValue = jest.fn()
  const mockValidateImmediately = jest.fn()
  const mockClear = jest.fn()
  const mockValidate = jest.fn()
  const mockOnSubmit = jest.fn()

  const defaultMockReturn = {
    state: {
      value: '',
      isValid: false,
      isValidating: false,
      error: undefined,
      errorType: undefined,
      normalizedUrl: undefined,
      showSuggestion: false,
      suggestion: undefined,
      validatedAt: undefined,
    },
    setValue: mockSetValue,
    validate: mockValidate,
    validateImmediately: mockValidateImmediately,
    clear: mockClear,
    getFeedback: () => [],
    isReady: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
    mockUseURLValidation.mockReturnValue(defaultMockReturn)
  })

  describe('Story 3-1: Basic rendering and accessibility', () => {
    it('should render with proper form elements and accessibility attributes', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /analyze url/i })).toBeInTheDocument()
      expect(screen.getByText('URL Analysis')).toBeInTheDocument()
      expect(screen.getByText(/enter a url to check for potential scams/i)).toBeInTheDocument()
    })

    it('should have proper input attributes for mobile optimization', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'url')
      expect(input).toHaveAttribute('inputMode', 'url')
      expect(input).toHaveAttribute('autoComplete', 'url')
      expect(input).toHaveAttribute('autoCapitalize', 'none')
      expect(input).toHaveAttribute('spellCheck', 'false')
    })

    it('should auto-focus input field by default', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('autoFocus')
    })

    it('should not auto-focus when autoFocus is disabled', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} autoFocus={false} />) // eslint-disable-line jsx-a11y/no-autofocus -- Testing Story 3-1 requirement

      const input = screen.getByRole('textbox')
      expect(input).not.toHaveAttribute('autoFocus')
    })
  })

  describe('Story 3-1: Real-time validation feedback', () => {
    it('should call setValue when user types', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'https://example.com')

      expect(mockSetValue).toHaveBeenCalledWith('h')
      expect(mockSetValue).toHaveBeenCalledWith('ht')
      // ... and so on for each character
      expect(mockSetValue).toHaveBeenCalledWith('https://example.com')
    })

    it('should show validating state with spinner', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
          isValidating: true,
        },
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      expect(screen.getByTestId('spinner') || screen.getByRole('status')).toBeInTheDocument()
    })

    it('should show success state with green border and checkmark', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
          isValid: true,
          normalizedUrl: 'https://example.com',
        },
        isReady: true,
        getFeedback: () => [
          {
            level: 'success',
            message: 'URL is valid and ready for analysis',
          },
        ],
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-green-500')
      expect(screen.getByTestId('check-circle') || screen.getByText('URL is valid')).toBeInTheDocument()
    })

    it('should show error state with red border and error message', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'invalid-url',
          isValid: false,
          error: 'Please enter a valid URL',
          errorType: 'invalid-format',
        },
        getFeedback: () => [
          {
            level: 'error',
            message: 'Please enter a valid URL',
          },
        ],
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-destructive')
      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument()
    })
  })

  describe('Story 3-1: Paste event handling', () => {
    it('should call validateImmediately on paste', async () => {
      const user = userEvent.setup()
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      })
      pasteEvent.clipboardData?.setData('text', 'https://pasted-url.com')
      
      fireEvent.paste(input, pasteEvent)

      expect(mockValidateImmediately).toHaveBeenCalledWith('https://pasted-url.com')
    })
  })

  describe('Story 3-1: Suggestion handling', () => {
    it('should display suggestion with apply button', () => {
      const mockApplySuggestion = jest.fn()
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'example.com',
          suggestion: 'https://example.com',
          showSuggestion: true,
        },
        getFeedback: () => [
          {
            level: 'info',
            message: 'URL can be optimized',
            suggestion: 'https://example.com',
            action: {
              label: 'Apply optimization',
              onClick: mockApplySuggestion,
            },
          },
        ],
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText('URL can be optimized')).toBeInTheDocument()
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /apply optimization/i })).toBeInTheDocument()
    })

    it('should apply suggestion when button is clicked', async () => {
      const user = userEvent.setup()
      const mockApplySuggestion = jest.fn()
      
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        getFeedback: () => [
          {
            level: 'info',
            message: 'URL can be optimized',
            suggestion: 'https://example.com',
            action: {
              label: 'Apply optimization',
              onClick: mockApplySuggestion,
            },
          },
        ],
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const applyButton = screen.getByRole('button', { name: /apply optimization/i })
      await user.click(applyButton)

      expect(mockApplySuggestion).toHaveBeenCalled()
    })
  })

  describe('Story 3-1: Clear functionality', () => {
    it('should show clear button when input has value', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
        },
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      expect(screen.getByRole('button', { name: /clear url input/i })).toBeInTheDocument()
    })

    it('should call clear when clear button is clicked', async () => {
      const user = userEvent.setup()
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
        },
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const clearButton = screen.getByRole('button', { name: /clear url input/i })
      await user.click(clearButton)

      expect(mockClear).toHaveBeenCalled()
    })

    it('should not show clear button when input is empty', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByRole('button', { name: /clear url input/i })).not.toBeInTheDocument()
    })
  })

  describe('Story 3-1: Form submission', () => {
    it('should be disabled when URL is not ready', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /analyze url/i })
      expect(submitButton).toBeDisabled()
    })

    it('should be enabled when URL is ready', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
          isValid: true,
        },
        isReady: true,
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /analyze url/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('should call onSubmit with normalized URL when form is submitted', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined)
      
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
          isValid: true,
          normalizedUrl: 'https://example.com/',
        },
        isReady: true,
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /analyze url/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com/')
      })
    })

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined)
      
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
          isValid: true,
        },
        isReady: true,
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /analyze url/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockClear).toHaveBeenCalled()
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
          isValid: true,
        },
        isReady: true,
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByRole('button', { name: /analyze url/i })
      await user.click(submitButton)

      expect(screen.getByText('Analyzing URL...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Story 3-1: Touch targets and mobile optimization', () => {
    it('should have minimum 48px height for touch targets', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /analyze url/i })

      expect(input).toHaveClass('h-12') // 48px
      expect(submitButton).toHaveClass('min-h-[48px]')
    })

    it('should have proper text size to prevent iOS zoom', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('text-base') // 16px to prevent zoom
    })
  })

  describe('Story 3-1: Accessibility features', () => {
    it('should have proper ARIA attributes', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'invalid-url',
          isValid: false,
          error: 'Invalid URL',
        },
        getFeedback: () => [
          {
            level: 'error',
            message: 'Invalid URL',
          },
        ],
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'url-feedback')
    })

    it('should have proper role and aria-live for feedback', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        getFeedback: () => [
          {
            level: 'error',
            message: 'Invalid URL',
          },
        ],
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const feedback = screen.getByRole('status')
      expect(feedback).toHaveAttribute('aria-live', 'assertive')
      expect(feedback).toHaveAttribute('id', 'url-feedback')
    })

    it('should have polite aria-live for non-error feedback', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        getFeedback: () => [
          {
            level: 'info',
            message: 'Validating URL...',
          },
        ],
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const feedback = screen.getByRole('status')
      expect(feedback).toHaveAttribute('aria-live', 'polite')
    })

    it('should have proper button labels for screen readers', () => {
      mockUseURLValidation.mockReturnValue({
        ...defaultMockReturn,
        state: {
          ...defaultMockReturn.state,
          value: 'https://example.com',
        },
      })

      render(<UrlInputForm onSubmit={mockOnSubmit} />)

      const clearButton = screen.getByRole('button', { name: 'Clear URL input' })
      expect(clearButton).toHaveAttribute('aria-label', 'Clear URL input')
    })
  })

  describe('Props and customization', () => {
    it('should accept custom className', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} className="custom-class" />)

      const card = screen.getByRole('textbox').closest('.custom-class')
      expect(card).toBeInTheDocument()
    })

    it('should respect disabled prop', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} disabled />)

      const input = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /analyze url/i })
      
      expect(input).toBeDisabled()
      expect(button).toBeDisabled()
    })

    it('should initialize with initialValue', () => {
      render(<UrlInputForm onSubmit={mockOnSubmit} initialValue="https://initial.com" />)

      expect(mockSetValue).toHaveBeenCalledWith('https://initial.com')
    })
  })
})